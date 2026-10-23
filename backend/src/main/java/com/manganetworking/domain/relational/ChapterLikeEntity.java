package com.manganetworking.domain.relational;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Curtida de um capítulo (coração), independente da curtida/favorito da obra.
 *
 * <p>A constraint (user_id, chapter_id) impede duplicação; o total exibido é
 * mantido em {@code chapters.likes} de forma atômica.</p>
 */
@Entity
@Table(name = "chapter_likes", uniqueConstraints = {
        @UniqueConstraint(name = "uq_chapter_likes_user_chapter", columnNames = {"user_id", "chapter_id"})
})
public class ChapterLikeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "chapter_id", nullable = false)
    private ChapterEntity chapter;

    @CreationTimestamp
    private LocalDateTime createdAt;

    public ChapterLikeEntity() {}

    public ChapterLikeEntity(UserEntity user, ChapterEntity chapter) {
        this.user = user;
        this.chapter = chapter;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }
    public ChapterEntity getChapter() { return chapter; }
    public void setChapter(ChapterEntity chapter) { this.chapter = chapter; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
