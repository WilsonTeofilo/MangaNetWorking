package com.manganetworking.service.feed;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.feed.dto.FeedWorkResponseDto;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FeedApplicationServiceTest {

    private final WorkFeedMongoRepository repository = mock(WorkFeedMongoRepository.class);
    private final RecommendationAlgorithmService algorithm = mock(RecommendationAlgorithmService.class);
    private final FeedApplicationService service = new FeedApplicationService(repository, algorithm);

    @Test
    @DisplayName("Feed público exclui suspensas na própria consulta (não consome slot da página)")
    void excludesSuspendedInQuery() {
        WorkFeedDocument active = feedDoc("active-work", "ongoing");
        when(repository.findAllByStatusNotOrderByDiscoveryScoreDesc(eq("suspended"), any(Pageable.class)))
                .thenReturn(List.of(active));

        List<FeedWorkResponseDto> results = service.getFeed("recommended", null, 0, 20);

        assertEquals(List.of("active-work"), results.stream().map(FeedWorkResponseDto::workId).toList());
        verify(repository).findAllByStatusNotOrderByDiscoveryScoreDesc(eq("suspended"), any(Pageable.class));
    }

    @Test
    @DisplayName("Filtro em memória permanece como defesa extra contra status com caixa variante")
    void keepsInMemoryDefenseAgainstCaseVariant() {
        WorkFeedDocument suspended = feedDoc("suspended-work", "SUSPENDED");
        when(repository.findAllByStatusNotOrderByDiscoveryScoreDesc(eq("suspended"), any(Pageable.class)))
                .thenReturn(List.of(suspended));

        List<FeedWorkResponseDto> results = service.getFeed("recommended", null, 0, 20);

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Ordenações trending/fresh também excluem suspensas na consulta")
    void trendingAndFreshExcludeSuspendedInQuery() {
        when(repository.findAllByStatusNotOrderByTrendingScoreDesc(eq("suspended"), any(Pageable.class)))
                .thenReturn(List.of());
        when(repository.findAllByStatusNotOrderByUpdatedAtDesc(eq("suspended"), any(Pageable.class)))
                .thenReturn(List.of());

        service.getFeed("trending", null, 0, 10);
        service.getFeed("fresh", null, 0, 10);

        verify(repository).findAllByStatusNotOrderByTrendingScoreDesc(eq("suspended"), any(Pageable.class));
        verify(repository).findAllByStatusNotOrderByUpdatedAtDesc(eq("suspended"), any(Pageable.class));
    }

    @Test
    @DisplayName("Feed por gênero exclui suspensas na consulta (gênero normalizado)")
    void genreFeedExcludesSuspendedInQuery() {
        when(repository.findAllByGenresContainingAndStatusNotOrderByDiscoveryScoreDesc(
                eq("ACAO"), eq("suspended"), any(Pageable.class)))
                .thenReturn(List.of());

        service.getFeed("recommended", "Ação", 0, 10);

        verify(repository).findAllByGenresContainingAndStatusNotOrderByDiscoveryScoreDesc(
                eq("ACAO"), eq("suspended"), any(Pageable.class));
    }

    private WorkFeedDocument feedDoc(String workId, String status) {
        WorkFeedDocument doc = new WorkFeedDocument();
        doc.setWorkId(workId);
        doc.setStatus(status);
        return doc;
    }
}
