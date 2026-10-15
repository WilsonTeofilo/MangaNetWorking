package com.manganetworking.domain.relational;

import com.manganetworking.domain.enums.TransactionType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "financial_ledger", indexes = {
    @Index(name = "idx_ledger_creator", columnList = "creator_id"),
    @Index(name = "idx_ledger_payment_id", columnList = "paymentExternalId", unique = true)
})
public class FinancialLedgerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Idempotência obrigatória: evita processamento duplo do mesmo webhook ou PIX
    @Column(nullable = false, unique = true, length = 120)
    private String paymentExternalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private CreatorEntity creator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private TransactionType transactionType;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal grossAmountBrl;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal feeRatePercent = new BigDecimal("17.00");

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal platformFeeBrl;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal creatorNetBrl;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal walletBalanceAfterBrl;

    @Column(length = 200)
    private String description;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public FinancialLedgerEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getPaymentExternalId() { return paymentExternalId; }
    public void setPaymentExternalId(String paymentExternalId) { this.paymentExternalId = paymentExternalId; }

    public CreatorEntity getCreator() { return creator; }
    public void setCreator(CreatorEntity creator) { this.creator = creator; }

    public TransactionType getTransactionType() { return transactionType; }
    public void setTransactionType(TransactionType transactionType) { this.transactionType = transactionType; }

    public BigDecimal getGrossAmountBrl() { return grossAmountBrl; }
    public void setGrossAmountBrl(BigDecimal grossAmountBrl) { this.grossAmountBrl = grossAmountBrl; }

    public BigDecimal getFeeRatePercent() { return feeRatePercent; }
    public void setFeeRatePercent(BigDecimal feeRatePercent) { this.feeRatePercent = feeRatePercent; }

    public BigDecimal getPlatformFeeBrl() { return platformFeeBrl; }
    public void setPlatformFeeBrl(BigDecimal platformFeeBrl) { this.platformFeeBrl = platformFeeBrl; }

    public BigDecimal getCreatorNetBrl() { return creatorNetBrl; }
    public void setCreatorNetBrl(BigDecimal creatorNetBrl) { this.creatorNetBrl = creatorNetBrl; }

    public BigDecimal getWalletBalanceAfterBrl() { return walletBalanceAfterBrl; }
    public void setWalletBalanceAfterBrl(BigDecimal walletBalanceAfterBrl) { this.walletBalanceAfterBrl = walletBalanceAfterBrl; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
