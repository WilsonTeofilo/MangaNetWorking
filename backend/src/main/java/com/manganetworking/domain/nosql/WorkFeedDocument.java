package com.manganetworking.domain.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "feed_works")
public class WorkFeedDocument {

    @Id
    private String id;

    @Indexed(unique = true)
    private String workId;

    private String title;
    private String slug;
    private String originalTitle;
    private String synopsis;
    private String coverUrl;
    private String bannerUrl;

    private String authorId;
    private String authorName;
    private String authorHandle;
    private String authorAvatarUrl;

    private List<String> genres;
    private String status;

    private Long totalViews = 0L;
    private Long totalLikes = 0L;
    private Long totalComments = 0L;
    private Integer totalChapters = 0;

    // Metadados do último capítulo lançado
    private Integer latestChapterNumber;
    private String latestChapterTitle;
    private Instant latestChapterReleaseAt;
    private boolean latestChapterIsEarlyAccess;

    // Métricas calculadas pelo Algoritmo (Estilo YouTube/Facebook)
    @Indexed
    private Double discoveryScore = 0.0;

    @Indexed
    private Double trendingScore = 0.0;

    private boolean freshRelease; // Lançado nas últimas 24h a 72h
    private Double creatorBoostMul = 1.0; // Multiplicador de missão do criador (1.0x a 2.2x)

    @Indexed
    private Instant updatedAt;

    public WorkFeedDocument() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getWorkId() { return workId; }
    public void setWorkId(String workId) { this.workId = workId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getOriginalTitle() { return originalTitle; }
    public void setOriginalTitle(String originalTitle) { this.originalTitle = originalTitle; }

    public String getSynopsis() { return synopsis; }
    public void setSynopsis(String synopsis) { this.synopsis = synopsis; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }

    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }

    public String getAuthorId() { return authorId; }
    public void setAuthorId(String authorId) { this.authorId = authorId; }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getAuthorHandle() { return authorHandle; }
    public void setAuthorHandle(String authorHandle) { this.authorHandle = authorHandle; }

    public String getAuthorAvatarUrl() { return authorAvatarUrl; }
    public void setAuthorAvatarUrl(String authorAvatarUrl) { this.authorAvatarUrl = authorAvatarUrl; }

    public List<String> getGenres() { return genres; }
    public void setGenres(List<String> genres) { this.genres = genres; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getTotalViews() { return totalViews; }
    public void setTotalViews(Long totalViews) { this.totalViews = totalViews; }

    public Long getTotalLikes() { return totalLikes; }
    public void setTotalLikes(Long totalLikes) { this.totalLikes = totalLikes; }

    public Long getTotalComments() { return totalComments; }
    public void setTotalComments(Long totalComments) { this.totalComments = totalComments; }

    public Integer getTotalChapters() { return totalChapters; }
    public void setTotalChapters(Integer totalChapters) { this.totalChapters = totalChapters; }

    public Integer getLatestChapterNumber() { return latestChapterNumber; }
    public void setLatestChapterNumber(Integer latestChapterNumber) { this.latestChapterNumber = latestChapterNumber; }

    public String getLatestChapterTitle() { return latestChapterTitle; }
    public void setLatestChapterTitle(String latestChapterTitle) { this.latestChapterTitle = latestChapterTitle; }

    public Instant getLatestChapterReleaseAt() { return latestChapterReleaseAt; }
    public void setLatestChapterReleaseAt(Instant latestChapterReleaseAt) { this.latestChapterReleaseAt = latestChapterReleaseAt; }

    public boolean isLatestChapterIsEarlyAccess() { return latestChapterIsEarlyAccess; }
    public void setLatestChapterIsEarlyAccess(boolean latestChapterIsEarlyAccess) { this.latestChapterIsEarlyAccess = latestChapterIsEarlyAccess; }

    public Double getDiscoveryScore() { return discoveryScore; }
    public void setDiscoveryScore(Double discoveryScore) { this.discoveryScore = discoveryScore; }

    public Double getTrendingScore() { return trendingScore; }
    public void setTrendingScore(Double trendingScore) { this.trendingScore = trendingScore; }

    public boolean isFreshRelease() { return freshRelease; }
    public void setFreshRelease(boolean freshRelease) { this.freshRelease = freshRelease; }

    public Double getCreatorBoostMul() { return creatorBoostMul; }
    public void setCreatorBoostMul(Double creatorBoostMul) { this.creatorBoostMul = creatorBoostMul; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
