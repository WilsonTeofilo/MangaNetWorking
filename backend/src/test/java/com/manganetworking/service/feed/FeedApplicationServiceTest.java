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
    @DisplayName("Feed público exclui suspensas e arquivadas LGPD na própria consulta")
    void excludesHiddenInQuery() {
        WorkFeedDocument active = feedDoc("active-work", "ongoing");
        when(repository.findAllByStatusNotInOrderByDiscoveryScoreDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class)))
                .thenReturn(List.of(active));

        List<FeedWorkResponseDto> results = service.getFeed("recommended", null, 0, 20);

        assertEquals(List.of("active-work"), results.stream().map(FeedWorkResponseDto::workId).toList());
        verify(repository).findAllByStatusNotInOrderByDiscoveryScoreDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class));
    }

    @Test
    @DisplayName("Filtro em memória permanece como defesa extra contra status com caixa variante")
    void keepsInMemoryDefenseAgainstCaseVariant() {
        WorkFeedDocument suspended = feedDoc("suspended-work", "SUSPENDED");
        WorkFeedDocument archived = feedDoc("archived-work", "Archived_LGPD");
        when(repository.findAllByStatusNotInOrderByDiscoveryScoreDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class)))
                .thenReturn(List.of(suspended, archived));

        List<FeedWorkResponseDto> results = service.getFeed("recommended", null, 0, 20);

        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Ordenações trending/fresh também excluem estados ocultos na consulta")
    void trendingAndFreshExcludeHiddenInQuery() {
        when(repository.findAllByStatusNotInOrderByTrendingScoreDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class)))
                .thenReturn(List.of());
        when(repository.findAllByStatusNotInOrderByUpdatedAtDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class)))
                .thenReturn(List.of());

        service.getFeed("trending", null, 0, 10);
        service.getFeed("fresh", null, 0, 10);

        verify(repository).findAllByStatusNotInOrderByTrendingScoreDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class));
        verify(repository).findAllByStatusNotInOrderByUpdatedAtDesc(
                eq(List.of("suspended", "archived_lgpd")), any(Pageable.class));
    }

    @Test
    @DisplayName("Feed por gênero exclui estados ocultos na consulta (gênero normalizado)")
    void genreFeedExcludesHiddenInQuery() {
        when(repository.findAllByGenresContainingAndStatusNotInOrderByDiscoveryScoreDesc(
                eq("ACAO"), eq(List.of("suspended", "archived_lgpd")), any(Pageable.class)))
                .thenReturn(List.of());

        service.getFeed("recommended", "Ação", 0, 10);

        verify(repository).findAllByGenresContainingAndStatusNotInOrderByDiscoveryScoreDesc(
                eq("ACAO"), eq(List.of("suspended", "archived_lgpd")), any(Pageable.class));
    }

    private WorkFeedDocument feedDoc(String workId, String status) {
        WorkFeedDocument doc = new WorkFeedDocument();
        doc.setWorkId(workId);
        doc.setStatus(status);
        return doc;
    }
}
