package com.manganetworking.domain.relational;

import com.manganetworking.domain.enums.ChapterFormat;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chapters", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"work_id", "chapterNumber"})
})
public class ChapterEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_id", nullable = false)
    private WorkEntity work;

    @Column(nullable = false)
    private Integer chapterNumber;

    @Column(nullable = false, length = 200)
    private String title;

    private String coverUrl;

    @Column(columnDefinition = "TEXT")
    private String pagesJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "chapter_format", nullable = false, length = 20)
    private ChapterFormat format = ChapterFormat.IMAGE_PAGES;

    @Column(name = "content_text", columnDefinition = "TEXT")
    private String contentText;

    @Column(nullable = false)
    private LocalDateTime publicReleaseAt;

    @Column(nullable = false)
    private Long views = 0L;

    @Column(nullable = false)
    private Long likes = 0L;

    @Column(nullable = false)
    private Long commentsCount = 0L;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public ChapterEntity() {}

    public boolean isEarlyAccessForMembers() {
        if (publicReleaseAt == null) return false;
        return LocalDateTime.now().isBefore(publicReleaseAt);
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public WorkEntity getWork() { return work; }
    public void setWork(WorkEntity work) { this.work = work; }

    public Integer getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }

    public String getPagesJson() { return pagesJson; }
    public void setPagesJson(String pagesJson) { this.pagesJson = pagesJson; }

    public ChapterFormat getFormat() { return format; }
    public void setFormat(ChapterFormat format) { this.format = format; }

    public String getContentText() { return contentText; }
    public void setContentText(String contentText) { this.contentText = contentText; }

    public LocalDateTime getPublicReleaseAt() { return publicReleaseAt; }
    public void setPublicReleaseAt(LocalDateTime publicReleaseAt) { this.publicReleaseAt = publicReleaseAt; }

    public Long getViews() { return views; }
    public void setViews(Long views) { this.views = views; }

    public Long getLikes() { return likes; }
    public void setLikes(Long likes) { this.likes = likes; }

    public Long getCommentsCount() { return commentsCount; }
    public void setCommentsCount(Long commentsCount) { this.commentsCount = commentsCount; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
