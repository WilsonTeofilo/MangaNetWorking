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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class RecommendationAlgorithmService {

    private static final Logger log = LoggerFactory.getLogger(RecommendationAlgorithmService.class);

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final WorkFeedMongoRepository feedMongoRepository;

    public RecommendationAlgorithmService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            WorkFeedMongoRepository feedMongoRepository
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.feedMongoRepository = feedMongoRepository;
    }

    /**
     * Sincroniza e calcula o score algorítmico de uma obra individual para o MongoDB feed_works
     */
    @Transactional(readOnly = true)
    public WorkFeedDocument syncWorkToFeed(WorkEntity work) {
        CreatorEntity author = work.getAuthor();
        List<ChapterEntity> chapters = chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId());
        ChapterEntity latestChapter = chapters.isEmpty() ? null : chapters.get(0);

        WorkFeedDocument doc = feedMongoRepository.findByWorkId(work.getId().toString())
                .orElseGet(() -> {
                    WorkFeedDocument newDoc = new WorkFeedDocument();
                    newDoc.setWorkId(work.getId().toString());
                    return newDoc;
                });

        doc.setTitle(work.getTitle());
        doc.setSlug(work.getSlug());
        doc.setOriginalTitle(work.getOriginalTitle());
        doc.setSynopsis(work.getSynopsis());
        doc.setCoverUrl(work.getCoverUrl());
        doc.setBannerUrl(work.getBannerUrl());
        doc.setStatus(work.getStatus());
        doc.setGenres(work.getGenres().stream().map(Enum::name).toList());
        doc.setTotalChapters(work.getTotalChapters());
        doc.setTotalViews(work.getTotalViews());
        doc.setTotalLikes(work.getTotalLikes());
        doc.setTotalComments(work.getTotalComments());

        if (author != null) {
            doc.setAuthorId(author.getId().toString());
            doc.setAuthorHandle("@" + author.getHandle());
            doc.setAuthorName(author.getUser() != null ? author.getUser().getName() : author.getHandle());
            doc.setAuthorAvatarUrl(author.getAvatarUrl());
        }

        // Metadados do último capítulo
        boolean isFresh = false;
        if (latestChapter != null) {
            doc.setLatestChapterNumber(latestChapter.getChapterNumber());
            doc.setLatestChapterTitle(latestChapter.getTitle());
            doc.setLatestChapterReleaseAt(latestChapter.getPublicReleaseAt().toInstant(ZoneOffset.UTC));
            doc.setLatestChapterIsEarlyAccess(latestChapter.isEarlyAccessForMembers());

            long hoursSinceRelease = Duration.between(latestChapter.getCreatedAt(), LocalDateTime.now()).toHours();
            isFresh = hoursSinceRelease <= 72;
        }
        doc.setFreshRelease(isFresh);

        // Boost de missão do Criador (Seasons Gamification)
        double boostMul = 1.0;
        if (author != null && author.hasActiveBoost()) {
            boostMul = author.getEngagementBoostMul() != null ? author.getEngagementBoostMul() : 1.0;
        }
        doc.setCreatorBoostMul(boostMul);

        // Cálculo do Score de Descoberta e Tendência
        double organicBase = (work.getTotalViews() * 1.0) + (work.getTotalLikes() * 5.0) + (work.getTotalComments() * 3.0);
        double recencyBonus = isFresh ? 220.0 : 0.0;
        long daysSinceUpdate = Duration.between(work.getUpdatedAt(), LocalDateTime.now()).toDays();
        double decayFactor = 1.0 / (1.0 + (daysSinceUpdate * 0.05));

        double qualityRatio = 1.0;
        if (work.getTotalViews() > 20) {
            double ratio = (double) work.getTotalLikes() / work.getTotalViews();
            qualityRatio = 1.0 + Math.min(ratio * 2.0, 1.0);
        }

        double discoveryScore = (organicBase + recencyBonus) * decayFactor * qualityRatio * boostMul;
        double trendingScore = (organicBase * 0.5 + (isFresh ? 350.0 : 0.0)) * qualityRatio * boostMul;

        doc.setDiscoveryScore(Math.round(discoveryScore * 100.0) / 100.0);
        doc.setTrendingScore(Math.round(trendingScore * 100.0) / 100.0);
        doc.setUpdatedAt(Instant.now());

        WorkFeedDocument saved = feedMongoRepository.save(doc);
        log.info("[ALGORITMO] Obra '{}' sincronizada no Feed Mongo. DiscoveryScore: {}, TrendingScore: {}, Boost: {}x",
                work.getTitle(), doc.getDiscoveryScore(), doc.getTrendingScore(), boostMul);
        return saved;
    }

    /**
     * Sincroniza o catálogo inteiro para o MongoDB (usado em cron/job ou reindexação manual)
     */
    @Transactional(readOnly = true)
    public int syncAllWorksToFeed() {
        List<WorkEntity> works = workRepository.findAll();
        for (WorkEntity work : works) {
            syncWorkToFeed(work);
        }
        log.info("[ALGORITMO] Catálogo completo sincronizado no MongoDB. Total de obras: {}", works.size());
        return works.size();
    }
}
