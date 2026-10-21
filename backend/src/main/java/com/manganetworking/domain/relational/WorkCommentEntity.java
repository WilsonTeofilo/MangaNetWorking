package com.manganetworking.domain.relational;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Comentário de uma obra (ou de um capítulo específico).
 *
 * <p>O corpo é sanitizado no serviço (sem HTML) e o banco só guarda texto puro: a renderização
 * no front nunca usa {@code innerHTML} com conteúdo de usuário.</p>
 */
@Entity
@Table(name = "work_comments")
public class WorkCommentEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_id", nullable = false)
    private WorkEntity work;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private ChapterEntity chapter;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(nullable = false, length = 1000)
    private String body;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public WorkCommentEntity() {
    }

    public UUID getId() { return id; }
    public WorkEntity getWork() { return work; }
    public void setWork(WorkEntity work) { this.work = work; }
    public ChapterEntity getChapter() { return chapter; }
    public void setChapter(ChapterEntity chapter) { this.chapter = chapter; }
    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
