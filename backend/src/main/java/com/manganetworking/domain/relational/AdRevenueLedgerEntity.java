package com.manganetworking.domain.relational;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ad_revenue_ledger", indexes = {
    @Index(name = "idx_ad_creator", columnList = "creator_id")
})
public class AdRevenueLedgerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    private CreatorEntity creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "work_id", nullable = false)
    private WorkEntity work;

    @Column(nullable = false)
    private Integer pagesReadThreshold = 30; // Disparado a cada 30 páginas lidas

    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal grossAdValueBrl; // Valor bruto gerado pelo anúncio

    // Repasse ao Criador Monetizado (58%)
    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal creatorShareBrl;

    // Retenção Plataforma MangaNetWorking (42%)
    @Column(nullable = false, precision = 10, scale = 4)
    private BigDecimal platformShareBrl;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public AdRevenueLedgerEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public CreatorEntity getCreator() { return creator; }
    public void setCreator(CreatorEntity creator) { this.creator = creator; }

    public WorkEntity getWork() { return work; }
    public void setWork(WorkEntity work) { this.work = work; }

    public Integer getPagesReadThreshold() { return pagesReadThreshold; }
    public void setPagesReadThreshold(Integer pagesReadThreshold) { this.pagesReadThreshold = pagesReadThreshold; }

    public BigDecimal getGrossAdValueBrl() { return grossAdValueBrl; }
    public void setGrossAdValueBrl(BigDecimal grossAdValueBrl) { this.grossAdValueBrl = grossAdValueBrl; }

    public BigDecimal getCreatorShareBrl() { return creatorShareBrl; }
    public void setCreatorShareBrl(BigDecimal creatorShareBrl) { this.creatorShareBrl = creatorShareBrl; }

    public BigDecimal getPlatformShareBrl() { return platformShareBrl; }
    public void setPlatformShareBrl(BigDecimal platformShareBrl) { this.platformShareBrl = platformShareBrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
