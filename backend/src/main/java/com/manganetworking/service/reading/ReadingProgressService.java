package com.manganetworking.service.reading;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.observability.ObservabilityMetricsService;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.nosql.ReadingProgressDocument;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

/**
 * Progresso de leitura (MongoDB) e gatilho demonstrativo de anúncios a cada N páginas.
 * O temporizador fictício não gera impressão financeira nem crédito em ledger.
 */
@Service
public class ReadingProgressService {

    private static final Logger log = LoggerFactory.getLogger(ReadingProgressService.class);

    /** Visualização de capítulo: 1 por leitor por capítulo por dia (fuso de exibição). */
    private static final String VIEW_EVENT = "VIEW";
    /** Leitura de página: alimenta a retenção, não a contagem de visualizações. */
    private static final String READ_EVENT = "READ";
    /** Janela de nova visualização: o mesmo leitor pode voltar em outro dia. */
    private static final ZoneId VIEW_ZONE = ZoneId.of("America/Sao_Paulo");

    private final ReadingProgressMongoRepository progressMongoRepository;
    private final ChapterRepository chapterRepository;
    private final UserRepository userRepository;
    private final WorkRepository workRepository;
    private final PlatformProperties properties;
    /** Versão atual do evento VIEW (incrementar quando a semântica mudar). */
    private static final int VIEW_EVENT_VERSION = 2;

    private final ObservabilityMetricsService observabilityMetricsService;
    private final ObjectMapper objectMapper;
    private final EngagementEventMongoRepository engagementEventRepository;

    public ReadingProgressService(
            ReadingProgressMongoRepository progressMongoRepository,
            ChapterRepository chapterRepository,
            UserRepository userRepository,
            WorkRepository workRepository,
            PlatformProperties properties,
            ObservabilityMetricsService observabilityMetricsService,
            ObjectMapper objectMapper,
            EngagementEventMongoRepository engagementEventRepository
    ) {
        this.progressMongoRepository = progressMongoRepository;
        this.chapterRepository = chapterRepository;
        this.userRepository = userRepository;
        this.workRepository = workRepository;
        this.properties = properties;
        this.observabilityMetricsService = observabilityMetricsService;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.engagementEventRepository = engagementEventRepository;
    }

    /**
     * Salva o progresso e dispara o intervalo demonstrativo configurado após N páginas distintas.
     */
    @Transactional
    public ReadingProgressResult trackPageRead(
            String userId,
            String workId,
            String chapterId,
            int page,
            int totalPages
    ) {
        ChapterEntity chapter = validateReadingPage(workId, chapterId, page, totalPages);

        ReadingProgressDocument doc = progressMongoRepository.findByUserIdAndWorkId(userId, workId)
                .orElseGet(() -> {
                    ReadingProgressDocument newDoc = new ReadingProgressDocument();
                    newDoc.setUserId(userId);
                    newDoc.setWorkId(workId);
                    return newDoc;
                });

        boolean chapterChanged = !chapterId.equals(doc.getChapterId());
        boolean newPageRead = chapterChanged || doc.getPage() == null || page > doc.getPage();
        int pageToPersist = chapterChanged || doc.getPage() == null ? page : Math.max(page, doc.getPage());

        doc.setChapterId(chapterId);
        doc.setChapterNumber(chapter.getChapterNumber());
        doc.setChapterTitle(chapter.getTitle());
        doc.setWorkTitle(chapter.getWork().getTitle());
        doc.setWorkCoverUrl(chapter.getWork().getCoverUrl());
        doc.setWorkSlug(chapter.getWork().getSlug());
        doc.setWorkFormat(chapter.getWork().getFormat() == null
                ? null
                : chapter.getWork().getFormat().name());
        doc.setPage(pageToPersist);
        doc.setTotalPages(totalPages);
        doc.setUpdatedAt(Instant.now());

        // Só avança o contador ao chegar numa página nova ou mudar de capítulo.
        int cumulative = doc.getCumulativePagesRead() == null ? 0 : doc.getCumulativePagesRead();
        if (newPageRead) {
            cumulative++;
            observabilityMetricsService.recordPageRead();
        }
        boolean shouldTriggerAd = false;

        // Verifica se o usuário é assinante VIP (isento de 100% dos anúncios)
        boolean isVip = false;
        try {
            if (userId != null && !userId.isBlank()) {
                isVip = userRepository.findById(UUID.fromString(userId))
                        .map(UserEntity::isVipActive)
                        .orElse(false);
            }
        } catch (RuntimeException e) {
            // Melhor esforço: falha ao checar VIP não deve derrubar a leitura; assume não-VIP.
            log.warn("[ANÚNCIOS] Não foi possível verificar status VIP do usuário {}: {}", userId, e.getMessage());
        }

        int pagesPerAd = properties.getAds().getPagesPerAd();
        if (pagesPerAd < 1) {
            throw new IllegalStateException("O intervalo de páginas entre anúncios deve ser positivo.");
        }

        if (newPageRead && cumulative >= pagesPerAd) {
            cumulative = 0; // Reinicia o ciclo de páginas
            if (!isVip) {
                shouldTriggerAd = true;
                // Criativo demonstrativo: não creditar receita nem gravar impressão financeira.
            }
        }

        doc.setCumulativePagesRead(cumulative);
        progressMongoRepository.save(doc);
        // Analytics só conta avanço de leitura: repetir a mesma página (retry, re-render,
        // heartbeat) não pode inflar leituras nem a retenção por página.
        if (newPageRead) {
            recordReadEvent(userId, workId, chapterId, page);
            // O evento VIEW é deduplicado por (leitor, capítulo): a checagem só acontece
            // quando o leitor avança de página, nunca a cada re-render da mesma página.
            recordChapterViewOnce(chapter, userId);
        }

        return new ReadingProgressResult(doc, shouldTriggerAd);
    }

    private ChapterEntity validateReadingPage(String workId, String chapterId, int page, int totalPages) {
        UUID workUuid;
        UUID chapterUuid;
        try {
            workUuid = UUID.fromString(workId);
            chapterUuid = UUID.fromString(chapterId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Identificador de obra ou capítulo inválido.", exception);
        }

        if (page < 1 || totalPages < 1 || page > totalPages) {
            throw new IllegalArgumentException("A página deve estar entre 1 e o total de páginas.");
        }

        ChapterEntity chapter = chapterRepository.findById(chapterUuid)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado."));
        if (chapter.getWork() == null || !chapter.getWork().getId().equals(workUuid)) {
            throw new ResourceNotFoundException("Capítulo não encontrado.");
        }
        // Light novel não tem páginas ilustradas: o progresso mensurável é a
        // permanência no texto (página 1 de 1). Sem isso, toda leitura em prosa
        // era rejeitada por não haver pagesJson para comparar.
        if (chapter.getFormat() == ChapterFormat.PROSE) {
            if (page != 1 || totalPages != 1) {
                throw new IllegalArgumentException("Capítulo em prosa deve ser lido na página 1 de 1.");
            }
            return chapter;
        }
        if (totalPages != countChapterPages(chapter.getPagesJson())) {
            throw new IllegalArgumentException("O total de páginas não corresponde ao capítulo.");
        }
        return chapter;
    }

    private int countChapterPages(String pagesJson) {
        try {
            return objectMapper.readTree(pagesJson).size();
        } catch (JsonProcessingException | NullPointerException exception) {
            throw new IllegalStateException("Páginas do capítulo armazenadas em formato inválido.", exception);
        }
    }

    /**
     * Alimenta a coleção {@code engagement_events} usada pelo analytics do criador e pela Season.
     * Melhor esforço: uma falha aqui nunca pode impedir o leitor de continuar lendo.
     */
    private void recordReadEvent(String userId, String workId, String chapterId, int page) {
        try {
            EngagementEventDocument event = new EngagementEventDocument();
            event.setEventType(READ_EVENT);
            event.setUserId(userId);
            event.setWorkId(workId);
            event.setChapterId(chapterId);
            event.setReadPage(page);
            engagementEventRepository.save(event);
        } catch (RuntimeException e) {
            log.warn("[ANALYTICS] Falha ao registrar evento de leitura da obra {}: {}", workId, e.getMessage());
        }
    }

    /**
     * Conta a visualização do capítulo uma única vez por leitor, capítulo e dia
     * (America/Sao_Paulo). A qualificação é a primeira página efetivamente alcançada:
     * abrir o capítulo e sair não conta. A janela diária permite que uma releitura
     * legítima em outro dia conte de novo, mas limita o spam a 1 por dia.
     *
     * <p>O evento {@code VIEW} é a fonte da verdade do analytics; os contadores
     * {@code chapters.views}/{@code works.total_views} são agregados atualizados
     * atomicamente. Best-effort: falha de contador não bloqueia a leitura.</p>
     */
    private void recordChapterViewOnce(ChapterEntity chapter, String userId) {
        if (chapter == null || chapter.getId() == null || userId == null || userId.isBlank()) {
            return;
        }
        String chapterId = chapter.getId().toString();
        String viewDay = LocalDate.now(VIEW_ZONE).toString();
        String idempotencyKey = userId + ":" + VIEW_EVENT + ":" + chapterId + ":" + viewDay;
        try {
            if (engagementEventRepository.existsByIdempotencyKey(idempotencyKey)) {
                return;
            }
            EngagementEventDocument event = new EngagementEventDocument();
            event.setEventType(VIEW_EVENT);
            event.setUserId(userId);
            event.setWorkId(chapter.getWork() != null && chapter.getWork().getId() != null
                    ? chapter.getWork().getId().toString()
                    : null);
            event.setChapterId(chapterId);
            event.setReadPage(1);
            event.setIdempotencyKey(idempotencyKey);
            // VIEW_EVENT_VERSION: incrementar quando a semântica de deduplicação mudar.
            event.setEventVersion(VIEW_EVENT_VERSION);
            engagementEventRepository.save(event);
        } catch (DuplicateKeyException duplicate) {
            // Duas requisições simultâneas: a chave única já registrou a view do dia.
            return;
        } catch (RuntimeException e) {
            log.warn("[ANALYTICS] Falha ao registrar visualização do capítulo {}: {}", chapterId, e.getMessage());
            return;
        }

        // Captura o vínculo antes do UPDATE em massa: o chapter pode ser
        // desanexado pelo clearAutomatically e a proxy lazy de work falharia.
        UUID chapterUuid = chapter.getId();
        WorkEntity work = chapter.getWork();
        UUID workUuid = work != null ? work.getId() : null;
        try {
            chapterRepository.incrementViews(chapterUuid);
            if (workUuid != null) {
                workRepository.incrementTotalViews(workUuid);
            }
        } catch (RuntimeException e) {
            // O evento já é a fonte do analytics; o contador exibido é melhor esforço.
            log.warn("[ANALYTICS] Falha ao atualizar contador de visualização do capítulo {}: {}",
                    chapterId, e.getMessage());
        }
    }

    public record ReadingProgressResult(ReadingProgressDocument progress, boolean triggerAd) {}
}
