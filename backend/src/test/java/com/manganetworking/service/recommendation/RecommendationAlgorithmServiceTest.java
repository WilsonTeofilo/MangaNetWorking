package com.manganetworking.service.recommendation;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Testes do algoritmo de ranking (Fase 5): decaimento temporal, qualidade de engajamento
 * e bônus de recência. Cobrem a fórmula autoritativa usada para materializar o feed.
 */
class RecommendationAlgorithmServiceTest {

    private final WorkRepository workRepo = mock(WorkRepository.class);
    private final ChapterRepository chapterRepo = mock(ChapterRepository.class);
    private final WorkFeedMongoRepository feedRepo = mock(WorkFeedMongoRepository.class);
    private final RecommendationAlgorithmService service = new RecommendationAlgorithmService(workRepo, chapterRepo, feedRepo);

    @Test
    @DisplayName("Decaimento temporal: sem data retorna piso 0.2 e 'agora' retorna 1.0")
    void calculatesTimeDecay() {
        assertEquals(0.2, service.calculateTimeDecay(null), 0.0001);
        assertEquals(1.0, service.calculateTimeDecay(LocalDateTime.now()), 0.0001);
        assertEquals(0.5, service.calculateTimeDecay(LocalDateTime.now().minusHours(36)), 0.0001);
    }

    @Test
    @DisplayName("Qualidade de engajamento respeita piso anti-spam e faixas de razão like/view")
    void calculatesEngagementQuality() {
        assertEquals(1.0, service.calculateEngagementQuality(0, 10), 0.0001);   // views < 40 -> piso
        assertEquals(1.25, service.calculateEngagementQuality(10, 100), 0.0001); // 10% -> altíssimo
        assertEquals(1.10, service.calculateEngagementQuality(5, 100), 0.0001);  // 5% -> bom
        assertEquals(0.90, service.calculateEngagementQuality(1, 100), 0.0001);  // 1% -> baixo
    }

    @Test
    @DisplayName("Bônus de recência segue as faixas de 24h/72h/168h/336h")
    void calculatesRecencyBoost() {
        assertEquals(new RecommendationAlgorithmService.RecencyResult(220.0, true),
                service.calculateRecencyBoost(LocalDateTime.now().minusHours(1)));
        assertEquals(new RecommendationAlgorithmService.RecencyResult(140.0, true),
                service.calculateRecencyBoost(LocalDateTime.now().minusHours(48)));
        assertEquals(new RecommendationAlgorithmService.RecencyResult(70.0, false),
                service.calculateRecencyBoost(LocalDateTime.now().minusDays(5)));
        assertEquals(new RecommendationAlgorithmService.RecencyResult(30.0, false),
                service.calculateRecencyBoost(LocalDateTime.now().minusDays(10)));
        assertEquals(new RecommendationAlgorithmService.RecencyResult(0.0, false),
                service.calculateRecencyBoost(LocalDateTime.now().minusDays(20)));
    }

    @Test
    @DisplayName("Bônus de recência sem data não pontua e não é considerado recente")
    void recencyBoostWithoutDate() {
        RecommendationAlgorithmService.RecencyResult result = service.calculateRecencyBoost(null);
        assertEquals(0.0, result.points(), 0.0001);
        assertFalse(result.isFresh());
    }

    @Test
    @DisplayName("Capítulo lançado agora é marcado como recém-publicado (fresh)")
    void marksFreshForRecentRelease() {
        RecommendationAlgorithmService.RecencyResult result =
                service.calculateRecencyBoost(LocalDateTime.now().minusHours(2));
        assertTrue(result.isFresh());
    }

    @Test
    @DisplayName("Boost de Season do criador multiplica o discoveryScore da obra")
    void appliesCreatorSeasonBoost() {
        WorkRepository workRepo = mock(WorkRepository.class);
        ChapterRepository chapterRepo = mock(ChapterRepository.class);
        WorkFeedMongoRepository feedRepo = mock(WorkFeedMongoRepository.class);
        RecommendationAlgorithmService algorithm = new RecommendationAlgorithmService(workRepo, chapterRepo, feedRepo);

        WorkEntity work = boostedWork(2.0);
        when(chapterRepo.findAllByWorkIdOrderByChapterNumberDesc(work.getId())).thenReturn(List.of());
        when(feedRepo.findByWorkId(work.getId().toString())).thenReturn(Optional.empty());
        when(feedRepo.save(any(WorkFeedDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkFeedDocument doc = algorithm.syncWorkToFeed(work);

        assertEquals(2.0, doc.getCreatorBoostMul(), 0.0001);
        assertTrue(doc.getDiscoveryScore() > 0);
    }

    @Test
    @DisplayName("Boost de Season é limitado ao teto de 2.5x")
    void capsCreatorSeasonBoost() {
        WorkRepository workRepo = mock(WorkRepository.class);
        ChapterRepository chapterRepo = mock(ChapterRepository.class);
        WorkFeedMongoRepository feedRepo = mock(WorkFeedMongoRepository.class);
        RecommendationAlgorithmService algorithm = new RecommendationAlgorithmService(workRepo, chapterRepo, feedRepo);

        WorkEntity work = boostedWork(5.0);
        when(chapterRepo.findAllByWorkIdOrderByChapterNumberDesc(work.getId())).thenReturn(List.of());
        when(feedRepo.findByWorkId(work.getId().toString())).thenReturn(Optional.empty());
        when(feedRepo.save(any(WorkFeedDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkFeedDocument doc = algorithm.syncWorkToFeed(work);

        assertEquals(2.5, doc.getCreatorBoostMul(), 0.0001);
    }

    @Test
    @DisplayName("Job agendado e reindexação são @Transactional (sem OSIV, o LAZY exige sessão aberta)")
    void feedJobsAreTransactional() throws NoSuchMethodException {
        Transactional scheduled = RecommendationAlgorithmService.class
                .getMethod("scheduleFeedRecalculation").getAnnotation(Transactional.class);
        Transactional reindex = RecommendationAlgorithmService.class
                .getMethod("syncAllWorksToFeed").getAnnotation(Transactional.class);

        assertNotNull(scheduled, "scheduleFeedRecalculation precisa de @Transactional: o agendador não tem "
                + "OSIV e o laço toca associações LAZY");
        assertNotNull(reindex, "syncAllWorksToFeed precisa de @Transactional");
    }

    @Test
    @DisplayName("Obra suspensa é removida do feed e não é rematerializada")
    void removesSuspendedWorkFromFeed() {
        RecommendationAlgorithmService algorithm = newService();

        WorkEntity suspended = suspendedWork();

        WorkFeedDocument result = algorithm.syncWorkToFeed(suspended);

        assertNull(result, "Obra suspensa não deve ser materializada no feed");
        verify(feedRepo).deleteByWorkId(suspended.getId().toString());
        verify(feedRepo, never()).save(any(WorkFeedDocument.class));
    }

    @Test
    @DisplayName("Obra arquivada por LGPD é removida do feed e não é rematerializada")
    void removesArchivedLgpdWorkFromFeed() {
        RecommendationAlgorithmService algorithm = newService();

        WorkEntity archived = suspendedWork();
        archived.setStatus("archived_lgpd");

        WorkFeedDocument result = algorithm.syncWorkToFeed(archived);

        assertNull(result, "Obra arquivada por LGPD não deve ser materializada no feed");
        verify(feedRepo).deleteByWorkId(archived.getId().toString());
        verify(feedRepo, never()).save(any(WorkFeedDocument.class));
    }

    @Test
    @DisplayName("Reindexação não ressuscita obra suspensa e ainda sincroniza as ativas")
    void reindexDoesNotResurrectSuspendedWork() {
        RecommendationAlgorithmService algorithm = newService();

        WorkEntity active = boostedWork(1.0);
        WorkEntity suspended = suspendedWork();
        when(workRepo.findAll()).thenReturn(List.of(active, suspended));
        when(chapterRepo.findAllByWorkIdOrderByChapterNumberDesc(any())).thenReturn(List.of());
        when(feedRepo.findByWorkId(active.getId().toString())).thenReturn(Optional.empty());
        when(feedRepo.save(any(WorkFeedDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        int total = algorithm.syncAllWorksToFeed();

        assertEquals(2, total);
        verify(feedRepo).save(any(WorkFeedDocument.class));            // apenas a obra ativa
        verify(feedRepo).deleteByWorkId(suspended.getId().toString()); // suspensa permanece fora do feed
    }

    @Test
    @DisplayName("syncWorkById busca a obra e materializa o feed na própria transação")
    void syncWorkByIdFindsAndSyncs() {
        RecommendationAlgorithmService algorithm = newService();
        WorkEntity suspended = suspendedWork();
        when(workRepo.findById(suspended.getId())).thenReturn(Optional.of(suspended));

        assertNull(algorithm.syncWorkById(suspended.getId()));

        verify(feedRepo).deleteByWorkId(suspended.getId().toString());
    }

    @Test
    @DisplayName("syncWorkById de obra inexistente não toca o feed")
    void syncWorkByIdAbsentDoesNotTouchFeed() {
        RecommendationAlgorithmService algorithm = newService();
        UUID missing = UUID.randomUUID();
        when(workRepo.findById(missing)).thenReturn(Optional.empty());

        assertNull(algorithm.syncWorkById(missing));

        verifyNoInteractions(feedRepo);
    }

    private RecommendationAlgorithmService newService() {
        return new RecommendationAlgorithmService(workRepo, chapterRepo, feedRepo);
    }

    private WorkEntity suspendedWork() {
        WorkEntity work = new WorkEntity();
        work.setId(UUID.randomUUID());
        work.setTitle("Obra Suspensa");
        work.setSlug("obra-suspensa");
        work.setCoverUrl("/api/storage/cover.jpg");
        work.setStatus("suspended");
        return work;
    }

    private WorkEntity boostedWork(double boostMul) {
        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle("autor-season");
        creator.setEngagementBoostMul(boostMul);
        creator.setEngagementBoostUntil(LocalDateTime.now().plusHours(24));

        WorkEntity work = new WorkEntity();
        work.setId(UUID.randomUUID());
        work.setAuthor(creator);
        work.setTitle("Obra da Season");
        work.setSlug("obra-season");
        work.setCoverUrl("/api/storage/cover.jpg");
        work.setTotalViews(1000L);
        work.setTotalLikes(100L);
        work.setTotalComments(20L);
        work.setTotalChapters(3);
        work.setUpdatedAt(LocalDateTime.now());
        return work;
    }
}
