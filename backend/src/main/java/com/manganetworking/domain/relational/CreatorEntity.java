package com.manganetworking.domain.relational;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.manganetworking.config.security.AesCryptoConverter;
import com.manganetworking.domain.enums.PixKeyType;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "creators")
public class CreatorEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserEntity user;

    @Column(nullable = false, unique = true, length = 50)
    private String handle;

    @Column(columnDefinition = "TEXT")
    private String bio;

    private String avatarUrl;

    // Redes e Portfólio do Criador
    private String instagramUrl;
    private String youtubeUrl;
    private String portfolioUrl;

    // Nível na Plataforma: 0 = Iniciante, 1 = Em Ascensão, 2 = Monetizado
    // Monetização (doações, membros e anúncios) desbloqueia no nível 2
    @Column(nullable = false)
    private Integer monetizationLevel = 0;

    // Nunca serializados diretamente: dados pessoais criptografados em repouso (LGPD).
    // O acesso é feito apenas por DTOs explícitos (ex.: workspace do próprio autor).
    @JsonIgnore
    @Column(nullable = false)
    @Convert(converter = AesCryptoConverter.class)
    private String documentCpf;

    @JsonIgnore
    @Column(nullable = false)
    @Convert(converter = AesCryptoConverter.class)
    private String pixKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PixKeyType pixKeyType;

    // Preço da assinatura configurado pelo autor (entre R$ 7,99 e R$ 45,99)
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal membershipPriceBrl = new BigDecimal("23.00");

    // Saldo líquido (83% das doações e membros + 58% dos anúncios) disponível para saque via PIX
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal walletBalanceBrl = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer monthlyMembersCount = 0;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDonationsBrl = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean verified = false;

    // Multiplicador de Boost de Algoritmo ganho por cumprir missões (1.0 = normal, até 2.2 = boost máximo)
    @Column(nullable = false)
    private Double engagementBoostMul = 1.0;

    private LocalDateTime engagementBoostUntil;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public CreatorEntity() {}

    public boolean isMonetizationUnlocked() {
        return monetizationLevel != null && monetizationLevel >= 2;
    }

    public boolean hasActiveBoost() {
        if (engagementBoostMul == null || engagementBoostMul <= 1.0) {
            return false;
        }
        if (engagementBoostUntil == null) {
            return false;
        }
        return engagementBoostUntil.isAfter(LocalDateTime.now());
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UserEntity getUser() { return user; }
    public void setUser(UserEntity user) { this.user = user; }

    public String getHandle() { return handle; }
    public void setHandle(String handle) { this.handle = handle; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getInstagramUrl() { return instagramUrl; }
    public void setInstagramUrl(String instagramUrl) { this.instagramUrl = instagramUrl; }

    public String getYoutubeUrl() { return youtubeUrl; }
    public void setYoutubeUrl(String youtubeUrl) { this.youtubeUrl = youtubeUrl; }

    public String getPortfolioUrl() { return portfolioUrl; }
    public void setPortfolioUrl(String portfolioUrl) { this.portfolioUrl = portfolioUrl; }

    public Integer getMonetizationLevel() { return monetizationLevel; }
    public void setMonetizationLevel(Integer monetizationLevel) { this.monetizationLevel = monetizationLevel; }

    public String getDocumentCpf() { return documentCpf; }
    public void setDocumentCpf(String documentCpf) { this.documentCpf = documentCpf; }

    public String getPixKey() { return pixKey; }
    public void setPixKey(String pixKey) { this.pixKey = pixKey; }

    public PixKeyType getPixKeyType() { return pixKeyType; }
    public void setPixKeyType(PixKeyType pixKeyType) { this.pixKeyType = pixKeyType; }

    public BigDecimal getMembershipPriceBrl() { return membershipPriceBrl; }
    public void setMembershipPriceBrl(BigDecimal membershipPriceBrl) { this.membershipPriceBrl = membershipPriceBrl; }

    public BigDecimal getWalletBalanceBrl() { return walletBalanceBrl; }
    public void setWalletBalanceBrl(BigDecimal walletBalanceBrl) { this.walletBalanceBrl = walletBalanceBrl; }

    public Integer getMonthlyMembersCount() { return monthlyMembersCount; }
    public void setMonthlyMembersCount(Integer monthlyMembersCount) { this.monthlyMembersCount = monthlyMembersCount; }

    public BigDecimal getTotalDonationsBrl() { return totalDonationsBrl; }
    public void setTotalDonationsBrl(BigDecimal totalDonationsBrl) { this.totalDonationsBrl = totalDonationsBrl; }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public Double getEngagementBoostMul() { return engagementBoostMul; }
    public void setEngagementBoostMul(Double engagementBoostMul) { this.engagementBoostMul = engagementBoostMul; }

    public LocalDateTime getEngagementBoostUntil() { return engagementBoostUntil; }
    public void setEngagementBoostUntil(LocalDateTime engagementBoostUntil) { this.engagementBoostUntil = engagementBoostUntil; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
