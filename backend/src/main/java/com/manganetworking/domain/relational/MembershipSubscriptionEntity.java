package com.manganetworking.domain.relational;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "membership_subscriptions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"subscriber_user_id", "creator_id"})
})
public class MembershipSubscriptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscriber_user_id", nullable = false)
    private UserEntity subscriber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private CreatorEntity creator;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal monthlyPriceBrl;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFeeBrl; // 17%

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal creatorNetBrl; // 83%

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, CANCELLED, EXPIRED

    @Column(nullable = false)
    private LocalDateTime startsAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public MembershipSubscriptionEntity() {}

    public boolean isActive() {
        return "ACTIVE".equalsIgnoreCase(status) && expiresAt.isAfter(LocalDateTime.now());
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UserEntity getSubscriber() { return subscriber; }
    public void setSubscriber(UserEntity subscriber) { this.subscriber = subscriber; }

    public CreatorEntity getCreator() { return creator; }
    public void setCreator(CreatorEntity creator) { this.creator = creator; }

    public BigDecimal getMonthlyPriceBrl() { return monthlyPriceBrl; }
    public void setMonthlyPriceBrl(BigDecimal monthlyPriceBrl) { this.monthlyPriceBrl = monthlyPriceBrl; }

    public BigDecimal getPlatformFeeBrl() { return platformFeeBrl; }
    public void setPlatformFeeBrl(BigDecimal platformFeeBrl) { this.platformFeeBrl = platformFeeBrl; }

    public BigDecimal getCreatorNetBrl() { return creatorNetBrl; }
    public void setCreatorNetBrl(BigDecimal creatorNetBrl) { this.creatorNetBrl = creatorNetBrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
