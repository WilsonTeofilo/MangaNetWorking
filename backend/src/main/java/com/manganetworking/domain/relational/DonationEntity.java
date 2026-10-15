package com.manganetworking.domain.relational;

import com.manganetworking.domain.enums.PaymentStatus;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "donations")
public class DonationEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "donor_user_id")
    private UserEntity donor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private CreatorEntity creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_id")
    private WorkEntity work;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chapter_id")
    private ChapterEntity chapter;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal grossAmountBrl;

    // Taxa retida pela plataforma (17%)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal platformFeeBrl;

    // Repasse líquido ao criador (83%)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal creatorNetBrl;

    @Column(length = 300)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column(length = 100)
    private String paymentExternalId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public DonationEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UserEntity getDonor() { return donor; }
    public void setDonor(UserEntity donor) { this.donor = donor; }

    public CreatorEntity getCreator() { return creator; }
    public void setCreator(CreatorEntity creator) { this.creator = creator; }

    public WorkEntity getWork() { return work; }
    public void setWork(WorkEntity work) { this.work = work; }

    public ChapterEntity getChapter() { return chapter; }
    public void setChapter(ChapterEntity chapter) { this.chapter = chapter; }

    public BigDecimal getGrossAmountBrl() { return grossAmountBrl; }
    public void setGrossAmountBrl(BigDecimal grossAmountBrl) { this.grossAmountBrl = grossAmountBrl; }

    public BigDecimal getPlatformFeeBrl() { return platformFeeBrl; }
    public void setPlatformFeeBrl(BigDecimal platformFeeBrl) { this.platformFeeBrl = platformFeeBrl; }

    public BigDecimal getCreatorNetBrl() { return creatorNetBrl; }
    public void setCreatorNetBrl(BigDecimal creatorNetBrl) { this.creatorNetBrl = creatorNetBrl; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public String getPaymentExternalId() { return paymentExternalId; }
    public void setPaymentExternalId(String paymentExternalId) { this.paymentExternalId = paymentExternalId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
