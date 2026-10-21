package com.manganetworking.domain.relational;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

/**
 * Seguidor de um escritor.
 *
 * <p>Só escritores (linhas em {@code creators}) podem ser seguidos: um leitor não tem
 * seguidores. A regra é do modelo, não da interface — o serviço recusa seguir um leitor.</p>
 */
@Entity
@Table(name = "creator_follows")
@IdClass(CreatorFollowEntity.Key.class)
public class CreatorFollowEntity {

    @Id
    @Column(name = "follower_id", nullable = false)
    private UUID followerId;

    @Id
    @Column(name = "creator_id", nullable = false)
    private UUID creatorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "follower_id", insertable = false, updatable = false)
    private UserEntity follower;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", insertable = false, updatable = false)
    private CreatorEntity creator;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public CreatorFollowEntity() {
    }

    public CreatorFollowEntity(UUID followerId, UUID creatorId) {
        this.followerId = followerId;
        this.creatorId = creatorId;
    }

    public UUID getFollowerId() { return followerId; }
    public UUID getCreatorId() { return creatorId; }
    public UserEntity getFollower() { return follower; }
    public CreatorEntity getCreator() { return creator; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    /** Chave composta (follower_id, creator_id). */
    public static class Key implements Serializable {
        private UUID followerId;
        private UUID creatorId;

        public Key() {
        }

        public Key(UUID followerId, UUID creatorId) {
            this.followerId = followerId;
            this.creatorId = creatorId;
        }

        public UUID getFollowerId() { return followerId; }
        public UUID getCreatorId() { return creatorId; }

        @Override
        public boolean equals(Object other) {
            if (this == other) return true;
            if (!(other instanceof Key)) return false;
            Key key = (Key) other;
            return Objects.equals(followerId, key.followerId) && Objects.equals(creatorId, key.creatorId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(followerId, creatorId);
        }
    }
}
