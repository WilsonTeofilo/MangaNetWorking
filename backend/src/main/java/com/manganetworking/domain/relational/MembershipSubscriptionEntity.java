package com.manganetworking.domain.relational;

import com.manganetworking.domain.enums.MembershipStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MembershipStatus status = MembershipStatus.ACTIVE; // ACTIVE, CANCELLED, EXPIRED

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
        return status == MembershipStatus.ACTIVE && expiresAt != null && expiresAt.isAfter(LocalDateTime.now());
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

    public MembershipStatus getStatus() { return status; }
    public void setStatus(MembershipStatus status) { this.status = status; }

    public LocalDateTime getStartsAt() { return startsAt; }
    public void setStartsAt(LocalDateTime startsAt) { this.startsAt = startsAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
