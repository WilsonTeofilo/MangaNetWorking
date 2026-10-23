package com.manganetworking.service.recommendation;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

/**
 * Serviço autoritativo de ranking de obras (Fase 5 do plano).
 *
 * <p>Fórmula: {@code Score = (BaseOrgânica + BônusRecência) × DecaimentoTemporal × QualidadeEngajamento × BoostMissão}.
 * Os sinais de volume entram normalizados por {@code log1p}, para que uma obra com 1.000.000 de views não
 * esmague uma obra nova com 1.000. O ranking de comentários é separado (curtidas predominantes,
 * respostas e recência como apoio) e vive no {@code WorkCommentRepository}.</p>
 *
 * <p>É a única implementação de algoritmo do backend. A antiga duplicata em
 * {@code com.manganetworking.algorithm} foi consolidada aqui para eliminar a colisão de bean
 * ({@code recommendationAlgorithmService}) que impedia a aplicação de subir.</p>
 */
@Service
public class RecommendationAlgorithmService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationAlgorithmService.class);

    private static final long RESCHEDULE_RATE_MS = 600_000L;
    private static final double MAX_CREATOR_BOOST = 2.5;
    private static final long MIN_VIEWS_FOR_QUALITY = 40;

    /** Obra suspensa cautelarmente ou arquivada por exclusão LGPD: não pode existir no feed. */
    private static final String SUSPENDED_STATUS = "suspended";
    private static final String ARCHIVED_LGPD_STATUS = "archived_lgpd";
    private static final java.util.Set<String> HIDDEN_STATUSES =
            java.util.Set.of(SUSPENDED_STATUS, ARCHIVED_LGPD_STATUS);

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final WorkFeedMongoRepository workFeedMongoRepository;

    public RecommendationAlgorithmService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            WorkFeedMongoRepository workFeedMongoRepository
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.workFeedMongoRepository = workFeedMongoRepository;
    }

    /**
     * Decaimento temporal logarítmico (estilo feeds do YouTube/Facebook).
     * Obras antigas sem novos lançamentos perdem relevância suavemente.
     */
    public double calculateTimeDecay(LocalDateTime lastUpdate) {
        if (lastUpdate == null) {
            return 0.2;
        }
        long hours = Math.max(0, Duration.between(lastUpdate, LocalDateTime.now()).toHours());
        return 1.0 / (1.0 + ((double) hours / 36.0));
    }

    /**
     * Razão de engajamento real (likes/views) com piso anti-spam.
     */
    public double calculateEngagementQuality(long likes, long views) {
        if (views < MIN_VIEWS_FOR_QUALITY) {
            return 1.0;
        }
        double ratio = (double) likes / (double) views;
        if (ratio >= 0.08) {
            return 1.25;
        }
        if (ratio >= 0.04) {
            return 1.10;
        }
        return 0.90;
    }

    /**
     * Bônus de lançamento recente: obras com capítulo recente sobem no feed imediatamente.
     */
    public RecencyResult calculateRecencyBoost(LocalDateTime lastUpdate) {
        if (lastUpdate == null) {
            return new RecencyResult(0.0, false);
        }
        long hours = Math.max(0, Duration.between(lastUpdate, LocalDateTime.now()).toHours());
        if (hours <= 24) {
            return new RecencyResult(220.0, true);
        }
        if (hours <= 72) {
            return new RecencyResult(140.0, true);
        }
        if (hours <= 168) {
            return new RecencyResult(70.0, false);
        }
        if (hours <= 336) {
            return new RecencyResult(30.0, false);
        }
        return new RecencyResult(0.0, false);
    }

    /**
     * Calcula a pontuação de uma obra e materializa/atualiza o documento no MongoDB.
     *
     * <p><b>Invariante:</b> obra suspensa cautelarmente ou arquivada por exclusão LGPD não pode existir no feed.
     * Quando a obra está oculta, o documento é removido do MongoDB e o método retorna {@code null}. Sem essa
     * guarda, o recálculo agendado (ou a publicação de capítulo pelo próprio autor) recriaria o documento que a
     * moderação removeu no {@code afterCommit} da suspensão ou que a exclusão de conta arquivou.</p>
     *
     * @return o documento materializado, ou {@code null} se a obra estiver oculta (removida do feed)
     */
    @Transactional(readOnly = true)
    public WorkFeedDocument syncWorkToFeed(WorkEntity work) {
        if (isHidden(work)) {
            workFeedMongoRepository.deleteByWorkId(work.getId().toString());
            log.debug("[ALGORITMO] Obra '{}' oculta ({}): removida do feed.", work.getTitle(), work.getStatus());
            return null;
        }

        CreatorEntity creator = work.getAuthor();
        List<ChapterEntity> chapters = chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId());
        ChapterEntity latestChapter = chapters.isEmpty() ? null : chapters.get(0);

        LocalDateTime lastUpdate = latestChapter != null ? latestChapter.getCreatedAt() : work.getUpdatedAt();

        double organicBase = normalized(work.getTotalViews()) * 1.0
                + normalized(work.getTotalLikes()) * 4.0
                + normalized(work.getTotalFavorites()) * 4.5
                + normalized(work.getTotalComments()) * 5.0
                + normalized(work.getTotalChapters()) * 3.0;

        RecencyResult recency = calculateRecencyBoost(lastUpdate);
        double baseWithRecency = organicBase + recency.points();

        double decay = calculateTimeDecay(lastUpdate);
        double quality = calculateEngagementQuality(work.getTotalLikes(), work.getTotalViews());

        double creatorBoost = 1.0;
        if (creator != null && creator.hasActiveBoost()) {
            creatorBoost = Math.min(MAX_CREATOR_BOOST, creator.getEngagementBoostMul());
        }

        double discoveryScore = baseWithRecency * decay * quality * creatorBoost;
        // Tendência prioriza engajamento recente; o decaimento separa o histórico do agora.
        double trendingScore = (normalized(work.getTotalViews())
                + normalized(work.getTotalLikes()) * 3.5
                + normalized(work.getTotalFavorites()) * 4.0
                + normalized(work.getTotalComments()) * 4.5) * Math.max(0.05, decay);

        WorkFeedDocument doc = workFeedMongoRepository.findByWorkId(work.getId().toString())
                .orElseGet(() -> {
                    WorkFeedDocument created = new WorkFeedDocument();
                    created.setWorkId(work.getId().toString());
                    return created;
                });

        doc.setTitle(work.getTitle());
        doc.setSlug(work.getSlug());
        doc.setOriginalTitle(work.getOriginalTitle());
        doc.setSynopsis(work.getSynopsis());
        doc.setCoverUrl(work.getCoverUrl());
        doc.setBannerUrl(work.getBannerUrl());
        doc.setStatus(work.getStatus());
        doc.setFormat(work.getFormat() != null ? work.getFormat().name() : "MANGA");
        doc.setGenres(work.getGenres().stream().map(Enum::name).toList());
        doc.setTotalChapters(work.getTotalChapters());
        doc.setTotalViews(work.getTotalViews());
        doc.setTotalLikes(work.getTotalLikes());
        doc.setTotalFavorites(work.getTotalFavorites());
        doc.setTotalComments(work.getTotalComments());

        if (creator != null) {
            doc.setAuthorId(creator.getId().toString());
            doc.setAuthorHandle("@" + creator.getHandle());
            doc.setAuthorName(creator.getUser() != null ? creator.getUser().getName() : creator.getHandle());
            doc.setAuthorAvatarUrl(creator.getAvatarUrl());
        }

        if (latestChapter != null) {
            doc.setLatestChapterNumber(latestChapter.getChapterNumber());
            doc.setLatestChapterTitle(latestChapter.getTitle());
            doc.setLatestChapterReleaseAt(latestChapter.getPublicReleaseAt().toInstant(ZoneOffset.UTC));
            doc.setLatestChapterIsEarlyAccess(latestChapter.isEarlyAccessForMembers());
        }

        doc.setDiscoveryScore(Math.round(discoveryScore * 100.0) / 100.0);
        doc.setTrendingScore(Math.round(trendingScore * 100.0) / 100.0);
        doc.setFreshRelease(recency.isFresh());
        doc.setCreatorBoostMul(creatorBoost);
        doc.setUpdatedAt(Instant.now());

        WorkFeedDocument saved = workFeedMongoRepository.save(doc);
        log.debug("[ALGORITMO] Obra '{}' sincronizada. DiscoveryScore={}, TrendingScore={}, Boost={}x",
                work.getTitle(), doc.getDiscoveryScore(), doc.getTrendingScore(), creatorBoost);
        return saved;
    }

    /**
     * Busca a obra por id e materializa/atualiza o feed na mesma transação.
     *
     * <p>Ponto de entrada para o tratamento de evento {@code AFTER_COMMIT}: ao abrir a própria transação,
     * a leitura da associação LAZY do autor ocorre com a sessão JPA aberta (OSIV desligado) e deixa de
     * depender de a sessão da requisição original ainda estar viva na fase {@code afterCommit}.</p>
     *
     * @return o documento materializado, ou {@code null} se a obra não existir ou estiver oculta
     */
    @Transactional(readOnly = true)
    public WorkFeedDocument syncWorkById(UUID workId) {
        return workRepository.findById(workId)
                .map(this::syncWorkToFeed)
                .orElse(null);
    }

    private boolean isHidden(WorkEntity work) {
        return work.getStatus() != null
                && HIDDEN_STATUSES.stream().anyMatch(status -> status.equalsIgnoreCase(work.getStatus()));
    }

    /** Compressão logarítmica dos contadores; sinais de vaidade não dominam a fila. */
    private double normalized(Number value) {
        long number = value == null ? 0L : value.longValue();
        return Math.log1p(Math.max(0L, number));
    }

    /**
     * Reindexa o catálogo inteiro (job agendado ou reindexação manual).
     * Uma falha em uma obra não interrompe as demais; obras suspensas/arquivadas por LGPD são removidas do feed
     * (ver {@link #syncWorkToFeed(WorkEntity)}).
     */
    @Transactional(readOnly = true)
    public int syncAllWorksToFeed() {
        List<WorkEntity> works = workRepository.findAll();
        for (WorkEntity work : works) {
            try {
                syncWorkToFeed(work);
            } catch (Exception e) {
                log.error("[ALGORITMO] Falha ao sincronizar obra {}: {}", work.getId(), e.getMessage(), e);
            }
        }
        return works.size();
    }

    /**
     * Job agendado: recalcula o ranking de todo o catálogo periodicamente.
     *
     * <p>{@code @Transactional(readOnly = true)} é obrigatório aqui: o agendador não passa por uma
     * requisição web, então não há OSIV; sem a transação, {@code syncWorkToFeed} acessaria
     * {@code work.getAuthor()} (associação LAZY) sobre entidades já desanexadas e lançaria
     * {@code LazyInitializationException} para toda obra. A transação mantém a sessão aberta
     * durante o laço.</p>
     */
    @Scheduled(fixedRate = RESCHEDULE_RATE_MS)
    @Transactional(readOnly = true)
    public void scheduleFeedRecalculation() {
        log.info("[ALGORITMO] Iniciando recálculo do feed...");
        int total = syncAllWorksToFeed();
        log.info("[ALGORITMO] Feed recalculado. Obras processadas: {}", total);
    }

    public record RecencyResult(double points, boolean isFresh) {}
}
