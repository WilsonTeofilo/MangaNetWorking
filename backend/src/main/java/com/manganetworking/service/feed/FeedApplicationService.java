package com.manganetworking.service.feed;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.feed.dto.FeedWorkResponseDto;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import com.manganetworking.util.GenreNormalizer;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FeedApplicationService {

    private static final String SUSPENDED_STATUS = "suspended";

    private final WorkFeedMongoRepository workFeedMongoRepository;
    private final RecommendationAlgorithmService algorithmService;

    public FeedApplicationService(
            WorkFeedMongoRepository workFeedMongoRepository,
            RecommendationAlgorithmService algorithmService
    ) {
        this.workFeedMongoRepository = workFeedMongoRepository;
        this.algorithmService = algorithmService;
    }

    public int syncCatalog() {
        return algorithmService.syncAllWorksToFeed();
    }

    public List<FeedWorkResponseDto> getFeed(String sort, String genre, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));

        if (genre != null && !genre.isBlank() && !genre.equalsIgnoreCase("TODOS")) {
            String normalizedGenre = GenreNormalizer.normalize(genre);
            return toResponse(excludeSuspended(
                    workFeedMongoRepository.findAllByGenresContainingAndStatusNotOrderByDiscoveryScoreDesc(
                            normalizedGenre, SUSPENDED_STATUS, pageable)
            ));
        }

        String sortKey = sort == null ? "recommended" : sort.toLowerCase();
        List<WorkFeedDocument> result = switch (sortKey) {
            case "trending" -> workFeedMongoRepository.findAllByStatusNotOrderByTrendingScoreDesc(SUSPENDED_STATUS, pageable);
            case "fresh" -> workFeedMongoRepository.findAllByStatusNotOrderByUpdatedAtDesc(SUSPENDED_STATUS, pageable);
            default -> workFeedMongoRepository.findAllByStatusNotOrderByDiscoveryScoreDesc(SUSPENDED_STATUS, pageable);
        };
        return toResponse(excludeSuspended(result));
    }

    public List<FeedWorkResponseDto> getTrending(int limit) {
        Pageable pageable = PageRequest.of(0, clampSize(limit));
        return toResponse(excludeSuspended(
                workFeedMongoRepository.findAllByStatusNotOrderByTrendingScoreDesc(SUSPENDED_STATUS, pageable)));
    }

    public List<FeedWorkResponseDto> getFreshReleases(int limit) {
        Pageable pageable = PageRequest.of(0, clampSize(limit));
        return toResponse(excludeSuspended(
                workFeedMongoRepository.findAllByStatusNotOrderByUpdatedAtDesc(SUSPENDED_STATUS, pageable)));
    }

    private List<FeedWorkResponseDto> toResponse(List<WorkFeedDocument> documents) {
        return documents.stream().map(FeedWorkResponseDto::from).toList();
    }

    /**
     * A exclusão de obras suspensas já é feita na consulta ({@code status != suspended}), o que preserva o
     * tamanho da página. Este filtro em memória permanece como defesa extra contra variações de caixa no
     * status já materializado.
     */
    private List<WorkFeedDocument> excludeSuspended(List<WorkFeedDocument> documents) {
        return documents.stream()
                .filter(doc -> doc.getStatus() == null || !SUSPENDED_STATUS.equalsIgnoreCase(doc.getStatus()))
                .toList();
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 10;
        }
        return Math.min(size, 50);
    }
}
