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
    private static final String ARCHIVED_LGPD_STATUS = "archived_lgpd";
    private static final String DRAFT_STATUS = "draft";
    public static final List<String> HIDDEN_STATUSES =
            List.of(SUSPENDED_STATUS, ARCHIVED_LGPD_STATUS, DRAFT_STATUS);

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
        return getFeed(sort, genre, null, page, size);
    }

    /**
     * Feed com o formato como primeiro eixo.
     *
     * <p>{@code format} nulo/vazio significa "tudo". Valor desconhecido também cai em "tudo":
     * parâmetro inválido nunca esconde conteúdo do leitor.</p>
     */
    public List<FeedWorkResponseDto> getFeed(String sort, String genre, String format, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(page, 0), clampSize(size));
        String normalizedFormat = normalizeFormat(format);

        if (genre != null && !genre.isBlank() && !genre.equalsIgnoreCase("TODOS")) {
            String normalizedGenre = GenreNormalizer.normalize(genre);
            if (normalizedFormat != null) {
                return toResponse(excludeHidden(
                        workFeedMongoRepository.findAllByGenresContainingAndFormatAndStatusNotInOrderByDiscoveryScoreDesc(
                                normalizedGenre, normalizedFormat, HIDDEN_STATUSES, pageable)
                ));
            }
            return toResponse(excludeHidden(
                    workFeedMongoRepository.findAllByGenresContainingAndStatusNotInOrderByDiscoveryScoreDesc(
                            normalizedGenre, HIDDEN_STATUSES, pageable)
            ));
        }

        String sortKey = sort == null ? "recommended" : sort.toLowerCase();
        List<WorkFeedDocument> result;
        if (normalizedFormat != null) {
            result = switch (sortKey) {
                case "trending" -> workFeedMongoRepository
                        .findAllByFormatAndStatusNotInOrderByTrendingScoreDesc(normalizedFormat, HIDDEN_STATUSES, pageable);
                case "fresh" -> workFeedMongoRepository
                        .findAllByFormatAndStatusNotInOrderByUpdatedAtDesc(normalizedFormat, HIDDEN_STATUSES, pageable);
                default -> workFeedMongoRepository
                        .findAllByFormatAndStatusNotInOrderByDiscoveryScoreDesc(normalizedFormat, HIDDEN_STATUSES, pageable);
            };
        } else {
            result = switch (sortKey) {
                case "trending" -> workFeedMongoRepository.findAllByStatusNotInOrderByTrendingScoreDesc(HIDDEN_STATUSES, pageable);
                case "fresh" -> workFeedMongoRepository.findAllByStatusNotInOrderByUpdatedAtDesc(HIDDEN_STATUSES, pageable);
                default -> workFeedMongoRepository.findAllByStatusNotInOrderByDiscoveryScoreDesc(HIDDEN_STATUSES, pageable);
            };
        }
        return toResponse(excludeHidden(result));
    }

    public List<FeedWorkResponseDto> getTrending(int limit) {
        return getTrending(limit, null);
    }

    public List<FeedWorkResponseDto> getTrending(int limit, String format) {
        Pageable pageable = PageRequest.of(0, clampSize(limit));
        String normalizedFormat = normalizeFormat(format);
        List<WorkFeedDocument> documents = normalizedFormat == null
                ? workFeedMongoRepository.findAllByStatusNotInOrderByTrendingScoreDesc(HIDDEN_STATUSES, pageable)
                : workFeedMongoRepository.findAllByFormatAndStatusNotInOrderByTrendingScoreDesc(
                        normalizedFormat, HIDDEN_STATUSES, pageable);
        return toResponse(excludeHidden(documents));
    }

    public List<FeedWorkResponseDto> getFreshReleases(int limit) {
        return getFreshReleases(limit, null);
    }

    public List<FeedWorkResponseDto> getFreshReleases(int limit, String format) {
        Pageable pageable = PageRequest.of(0, clampSize(limit));
        String normalizedFormat = normalizeFormat(format);
        List<WorkFeedDocument> documents = normalizedFormat == null
                ? workFeedMongoRepository.findAllByStatusNotInOrderByUpdatedAtDesc(HIDDEN_STATUSES, pageable)
                : workFeedMongoRepository.findAllByFormatAndStatusNotInOrderByUpdatedAtDesc(
                        normalizedFormat, HIDDEN_STATUSES, pageable);
        return toResponse(excludeHidden(documents));
    }

    /**
     * Traduz o formato público ({@code manga}, {@code light-novel}) para o valor guardado no
     * documento. Inválido/ausente vira {@code null} = sem filtro.
     */
    private String normalizeFormat(String format) {
        if (format == null || format.isBlank()) {
            return null;
        }
        String key = format.trim().toUpperCase().replace('-', '_');
        return switch (key) {
            case "MANGA", "MANGÁ" -> "MANGA";
            case "LIGHT_NOVEL", "LIGHTNOVEL", "NOVEL" -> "LIGHT_NOVEL";
            default -> null;
        };
    }

    private List<FeedWorkResponseDto> toResponse(List<WorkFeedDocument> documents) {
        return documents.stream().map(FeedWorkResponseDto::from).toList();
    }

    /**
     * A exclusão de obras suspensas e arquivadas por LGPD já é feita na consulta
     * ({@code status not in (...)}), o que preserva o tamanho da página. Este filtro em memória
     * permanece como defesa extra contra variações de caixa no status já materializado.
     */
    private List<WorkFeedDocument> excludeHidden(List<WorkFeedDocument> documents) {
        return documents.stream()
                .filter(doc -> doc.getStatus() == null
                        || HIDDEN_STATUSES.stream().noneMatch(hidden -> hidden.equalsIgnoreCase(doc.getStatus())))
                .toList();
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 10;
        }
        return Math.min(size, 50);
    }
}
