package com.manganetworking.domain.relational;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.WorkFormat;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "works")
public class WorkEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private CreatorEntity author;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    @Column(length = 150)
    private String originalTitle;

    @Column(columnDefinition = "TEXT")
    private String synopsis;

    @Column(nullable = false)
    private String coverUrl;

    private String bannerUrl;

    @ElementCollection(targetClass = Genre.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "work_genres", joinColumns = @JoinColumn(name = "work_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "genre")
    private List<Genre> genres = new ArrayList<>();

    @Column(nullable = false, length = 20)
    private String status = "ongoing";

    @Enumerated(EnumType.STRING)
    @Column(name = "work_format", nullable = false, length = 20)
    private WorkFormat format = WorkFormat.MANGA;

    @Column(nullable = false)
    private Integer totalChapters = 0;

    @Column(nullable = false)
    private Long totalViews = 0L;

    @Column(nullable = false)
    private Long totalLikes = 0L;

    @Column(nullable = false)
    private Long totalComments = 0L;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public WorkEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public CreatorEntity getAuthor() { return author; }
    public void setAuthor(CreatorEntity author) { this.author = author; }

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

    public List<Genre> getGenres() { return genres; }
    public void setGenres(List<Genre> genres) { this.genres = genres; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public WorkFormat getFormat() { return format; }
    public void setFormat(WorkFormat format) { this.format = format; }

    public Integer getTotalChapters() { return totalChapters; }
    public void setTotalChapters(Integer totalChapters) { this.totalChapters = totalChapters; }

    public Long getTotalViews() { return totalViews; }
    public void setTotalViews(Long totalViews) { this.totalViews = totalViews; }

    public Long getTotalLikes() { return totalLikes; }
    public void setTotalLikes(Long totalLikes) { this.totalLikes = totalLikes; }

    public Long getTotalComments() { return totalComments; }
    public void setTotalComments(Long totalComments) { this.totalComments = totalComments; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
