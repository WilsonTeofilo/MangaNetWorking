package com.manganetworking.domain.relational;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "creator_pix_key_audit")
public class CreatorPixKeyAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "creator_id", nullable = false, updatable = false)
    private UUID creatorId;

    @Column(name = "actor_user_id", nullable = false, updatable = false)
    private UUID actorUserId;

    @Column(name = "previous_key_type", length = 30, updatable = false)
    private String previousKeyType;

    @Column(name = "previous_key_mask", nullable = false, length = 8, updatable = false)
    private String previousKeyMask;

    @Column(name = "new_key_type", nullable = false, length = 30, updatable = false)
    private String newKeyType;

    @Column(name = "new_key_mask", nullable = false, length = 8, updatable = false)
    private String newKeyMask;

    @Column(name = "client_ip", nullable = false, length = 45, updatable = false)
    private String clientIp;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private LocalDateTime changedAt;

    protected CreatorPixKeyAuditEntity() {}

    public CreatorPixKeyAuditEntity(UUID creatorId, UUID actorUserId, String previousKeyType,
                                    String previousKeyMask, String newKeyType, String newKeyMask, String clientIp) {
        this.creatorId = creatorId;
        this.actorUserId = actorUserId;
        this.previousKeyType = previousKeyType;
        this.previousKeyMask = previousKeyMask;
        this.newKeyType = newKeyType;
        this.newKeyMask = newKeyMask;
        this.clientIp = clientIp;
    }

    public UUID getId() { return id; }
    public UUID getCreatorId() { return creatorId; }
    public UUID getActorUserId() { return actorUserId; }
    public String getPreviousKeyType() { return previousKeyType; }
    public String getPreviousKeyMask() { return previousKeyMask; }
    public String getNewKeyType() { return newKeyType; }
    public String getNewKeyMask() { return newKeyMask; }
    public String getClientIp() { return clientIp; }
    public LocalDateTime getChangedAt() { return changedAt; }
}
