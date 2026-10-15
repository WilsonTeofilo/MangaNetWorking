package com.manganetworking.algorithm;

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
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class RecommendationAlgorithmService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationAlgorithmService.class);

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
     * Calcula o Decaimento Temporal Logarítmico (Estilo Feed do YouTube / Facebook)
     * Obras mais antigas sem novos lançamentos perdem relevância suavemente.
     */
    public double calculateTimeDecay(LocalDateTime lastUpdate) {
        if (lastUpdate == null) return 0.2;
        long hours = Math.max(0, Duration.between(lastUpdate, LocalDateTime.now()).toHours());
        return 1.0 / (1.0 + ((double) hours / 36.0));
    }

    /**
     * Razão de Engajamento Real (Likes / Views) com piso anti-spam
     */
    public double calculateEngagementQuality(long likes, long views) {
        if (views < 40) return 1.0;
        double ratio = (double) likes / (double) views;
        if (ratio >= 0.08) return 1.25; // Altíssimo engajamento
        if (ratio >= 0.04) return 1.10;
        return 0.90;
    }

    /**
     * Bônus de Lançamento Recente
     * Obras que lançaram capítulo há pouco tempo sobem no feed imediatamente.
     */
    public RecencyResult calculateRecencyBoost(LocalDateTime lastUpdate) {
        if (lastUpdate == null) return new RecencyResult(0.0, false);
        long hours = Math.max(0, Duration.between(lastUpdate, LocalDateTime.now()).toHours());

        if (hours <= 24) return new RecencyResult(220.0, true);
        if (hours <= 72) return new RecencyResult(140.0, true);
        if (hours <= 168) return new RecencyResult(70.0, false);
        if (hours <= 336) return new RecencyResult(30.0, false);
        return new RecencyResult(0.0, false);
    }

    /**
     * Processa a pontuação de uma obra e indexa no MongoDB
     */
    @Transactional(readOnly = true)
    public WorkFeedDocument computeAndSyncWork(WorkEntity work) {
        CreatorEntity creator = work.getAuthor();
        List<ChapterEntity> chapters = chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId());
        ChapterEntity latestChapter = chapters.isEmpty() ? null : chapters.get(0);

        LocalDateTime lastUpdate = latestChapter != null ? latestChapter.getCreatedAt() : work.getUpdatedAt();

        // 1. Base Orgânica
        double organicBase = (work.getTotalViews() * 1.0)
                + (work.getTotalLikes() * 3.5)
                + (work.getTotalComments() * 5.0)
                + (work.getTotalChapters() * 3.0);

        // 2. Bônus de Lançamento
        RecencyResult recency = calculateRecencyBoost(lastUpdate);
        double baseWithRecency = organicBase + recency.points();

        // 3. Decaimento e Qualidade
        double decay = calculateTimeDecay(lastUpdate);
        double quality = calculateEngagementQuality(work.getTotalLikes(), work.getTotalViews());

        // 4. Boost de Missão do Criador (1.0x a 2.2x)
        double creatorBoost = 1.0;
        if (creator != null && creator.hasActiveBoost()) {
            creatorBoost = Math.min(2.5, creator.getEngagementBoostMul());
        }

        double discoveryScore = baseWithRecency * decay * quality * creatorBoost;
        double trendingScore = work.getTotalViews() + (work.getTotalLikes() * 3.0) + (work.getTotalComments() * 4.0);

        // Construir ou atualizar o documento no MongoDB
        WorkFeedDocument doc = workFeedMongoRepository.findByWorkId(work.getId().toString())
                .orElse(new WorkFeedDocument());

        doc.setWorkId(work.getId().toString());
        doc.setTitle(work.getTitle());
        doc.setSlug(work.getSlug());
        doc.setOriginalTitle(work.getOriginalTitle());
        doc.setSynopsis(work.getSynopsis());
        doc.setCoverUrl(work.getCoverUrl());
        doc.setBannerUrl(work.getBannerUrl());
        doc.setStatus(work.getStatus());
        doc.setGenres(work.getGenres().stream().map(Enum::name).toList());

        if (creator != null) {
            doc.setAuthorId(creator.getId().toString());
            doc.setAuthorHandle(creator.getHandle());
            doc.setAuthorName(creator.getUser() != null ? creator.getUser().getName() : creator.getHandle());
            doc.setAuthorAvatarUrl(creator.getAvatarUrl());
        }

        doc.setTotalViews(work.getTotalViews());
        doc.setTotalLikes(work.getTotalLikes());
        doc.setTotalComments(work.getTotalComments());
        doc.setTotalChapters(work.getTotalChapters());

        if (latestChapter != null) {
            doc.setLatestChapterNumber(latestChapter.getChapterNumber());
            doc.setLatestChapterTitle(latestChapter.getTitle());
            doc.setLatestChapterReleaseAt(latestChapter.getPublicReleaseAt().toInstant(ZoneOffset.UTC));
            doc.setLatestChapterIsEarlyAccess(latestChapter.isEarlyAccessForMembers());
        }

        doc.setDiscoveryScore(Math.round(discoveryScore * 10.0) / 10.0);
        doc.setTrendingScore(Math.round(trendingScore * 10.0) / 10.0);
        doc.setFreshRelease(recency.isFresh());
        doc.setCreatorBoostMul(creatorBoost);
        doc.setUpdatedAt(lastUpdate.toInstant(ZoneOffset.UTC));

        return workFeedMongoRepository.save(doc);
    }

    /**
     * Job Agendado: Recalcula o ranking de todo o catálogo a cada 10 minutos
     */
    @Scheduled(fixedRate = 600000)
    public void scheduleFeedRecalculation() {
        log.info("[ALGORITMO] Iniciando recálculo do feed no MongoDB...");
        List<WorkEntity> works = workRepository.findAll();
        for (WorkEntity work : works) {
            try {
                computeAndSyncWork(work);
            } catch (Exception e) {
                log.error("[ALGORITMO] Erro ao sincronizar obra {}: {}", work.getId(), e.getMessage());
            }
        }
        log.info("[ALGORITMO] Feed recalculado com sucesso. Total de obras processadas: {}", works.size());
    }

    public record RecencyResult(double points, boolean isFresh) {}
}
