package com.manganetworking.domain.relational;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
public class UserEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String name;

    private String avatarUrl;

    @Column(nullable = false)
    private boolean isCreator;

    // Se o perfil de leitor é visível publicamente para outros leitores
    @Column(nullable = false)
    private boolean isProfilePublic = true;

    // Hash seguro da senha (BCrypt / Argon2)
    private String passwordHash;

    // Status de 2FA obrigatório
    @Column(nullable = false)
    private boolean twoFactorEnabled = true;

    private String twoFactorSecret;

    // Assinatura VIP da Plataforma (Remove 100% dos anúncios)
    @Column(nullable = false)
    private boolean isVip = false;

    private LocalDateTime vipExpiresAt;

    // Obras curtidas pelo usuário (Biblioteca de favoritos)
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "user_liked_works",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "work_id")
    )
    private Set<WorkEntity> likedWorks = new HashSet<>();

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public UserEntity() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public boolean isCreator() { return isCreator; }
    public void setCreator(boolean creator) { isCreator = creator; }

    public boolean isProfilePublic() { return isProfilePublic; }
    public void setProfilePublic(boolean profilePublic) { isProfilePublic = profilePublic; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public boolean isTwoFactorEnabled() { return twoFactorEnabled; }
    public void setTwoFactorEnabled(boolean twoFactorEnabled) { this.twoFactorEnabled = twoFactorEnabled; }

    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }

    public Set<WorkEntity> getLikedWorks() { return likedWorks; }
    public void setLikedWorks(Set<WorkEntity> likedWorks) { this.likedWorks = likedWorks; }

    public boolean isVip() { return isVip; }
    public void setVip(boolean vip) { isVip = vip; }

    public LocalDateTime getVipExpiresAt() { return vipExpiresAt; }
    public void setVipExpiresAt(LocalDateTime vipExpiresAt) { this.vipExpiresAt = vipExpiresAt; }

    public boolean isVipActive() {
        return isVip && vipExpiresAt != null && vipExpiresAt.isAfter(LocalDateTime.now());
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
