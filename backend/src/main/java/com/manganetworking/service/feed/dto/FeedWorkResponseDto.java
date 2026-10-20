package com.manganetworking.service.feed.dto;

import com.manganetworking.domain.nosql.WorkFeedDocument;

import java.time.Instant;
import java.util.List;

/**
 * DTO de apresentação do feed.
 *
 * <p>Mantém exatamente os mesmos nomes de campo do {@link WorkFeedDocument} para não alterar o contrato
 * JSON consumido pelo frontend, mas desacopla a API do modelo de persistência do MongoDB (anotações
 * {@code @Document}/{@code @Id}/{@code @Indexed} deixam de vazar para a camada de apresentação).</p>
 */
public record FeedWorkResponseDto(
        String id,
        String workId,
        String title,
        String slug,
        String originalTitle,
        String synopsis,
        String coverUrl,
        String bannerUrl,
        String authorId,
        String authorName,
        String authorHandle,
        String authorAvatarUrl,
        List<String> genres,
        String status,
        String format,
        Long totalViews,
        Long totalLikes,
        Long totalComments,
        Integer totalChapters,
        Integer latestChapterNumber,
        String latestChapterTitle,
        Instant latestChapterReleaseAt,
        boolean latestChapterIsEarlyAccess,
        Double discoveryScore,
        Double trendingScore,
        boolean freshRelease,
        Double creatorBoostMul,
        Instant updatedAt
) {

    public static FeedWorkResponseDto from(WorkFeedDocument doc) {
        return new FeedWorkResponseDto(
                doc.getId(),
                doc.getWorkId(),
                doc.getTitle(),
                doc.getSlug(),
                doc.getOriginalTitle(),
                doc.getSynopsis(),
                doc.getCoverUrl(),
                doc.getBannerUrl(),
                doc.getAuthorId(),
                doc.getAuthorName(),
                doc.getAuthorHandle(),
                doc.getAuthorAvatarUrl(),
                doc.getGenres(),
                doc.getStatus(),
                doc.getFormat(),
                doc.getTotalViews(),
                doc.getTotalLikes(),
                doc.getTotalComments(),
                doc.getTotalChapters(),
                doc.getLatestChapterNumber(),
                doc.getLatestChapterTitle(),
                doc.getLatestChapterReleaseAt(),
                doc.isLatestChapterIsEarlyAccess(),
                doc.getDiscoveryScore(),
                doc.getTrendingScore(),
                doc.isFreshRelease(),
                doc.getCreatorBoostMul(),
                doc.getUpdatedAt()
        );
    }
}
