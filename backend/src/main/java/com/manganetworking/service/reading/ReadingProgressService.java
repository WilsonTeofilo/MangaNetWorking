package com.manganetworking.service.reading;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.nosql.ReadingProgressDocument;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

/**
 * Progresso de leitura (MongoDB) e gatilho demonstrativo de anúncios a cada N páginas.
 * O temporizador fictício não gera impressão financeira nem crédito em ledger.
 */
@Service
public class ReadingProgressService {

    private static final Logger log = LoggerFactory.getLogger(ReadingProgressService.class);

    private final ReadingProgressMongoRepository progressMongoRepository;
    private final ChapterRepository chapterRepository;
    private final UserRepository userRepository;
    private final PlatformProperties properties;
    private final com.manganetworking.config.observability.ObservabilityMetricsService observabilityMetricsService;
    private final EngagementEventMongoRepository engagementEventRepository;

    public ReadingProgressService(
            ReadingProgressMongoRepository progressMongoRepository,
            ChapterRepository chapterRepository,
            UserRepository userRepository,
            PlatformProperties properties,
            com.manganetworking.config.observability.ObservabilityMetricsService observabilityMetricsService,
            EngagementEventMongoRepository engagementEventRepository
    ) {
        this.progressMongoRepository = progressMongoRepository;
        this.chapterRepository = chapterRepository;
        this.userRepository = userRepository;
        this.properties = properties;
        this.observabilityMetricsService = observabilityMetricsService;
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
        recordReadEvent(userId, workId, chapterId, page);

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
        if (totalPages != countChapterPages(chapter.getPagesJson())) {
            throw new IllegalArgumentException("O total de páginas não corresponde ao capítulo.");
        }
        return chapter;
    }

    private int countChapterPages(String pagesJson) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readTree(pagesJson).size();
        } catch (com.fasterxml.jackson.core.JsonProcessingException | NullPointerException exception) {
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
            event.setEventType("READ");
            event.setUserId(userId);
            event.setWorkId(workId);
            event.setChapterId(chapterId);
            event.setReadPage(page);
            engagementEventRepository.save(event);
        } catch (RuntimeException e) {
            log.warn("[ANALYTICS] Falha ao registrar evento de leitura da obra {}: {}", workId, e.getMessage());
        }
    }

    public record ReadingProgressResult(ReadingProgressDocument progress, boolean triggerAd) {}
}
