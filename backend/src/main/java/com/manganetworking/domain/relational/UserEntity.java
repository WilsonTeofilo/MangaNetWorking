package com.manganetworking.domain.relational;

import com.manganetworking.domain.enums.Sex;
import com.manganetworking.config.security.AesCryptoConverter;
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

    // Identificador único e imutável do usuário: segunda forma de login (além do e-mail).
    // A unicidade sem distinção de caixa é garantida pelo índice `users_username_lower_key`.
    @Column(nullable = false, length = 30)
    private String username;

    // Sexo declarado no perfil. Dado opcional por natureza: o titular pode deixar
    // "nao informado" e a plataforma não presume nada.
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Sex sex = Sex.NAO_INFORMADO;

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

    private LocalDateTime emailVerifiedAt;

    @Convert(converter = AesCryptoConverter.class)
    private String twoFactorSecret;

    @Column(nullable = false)
    private boolean isModerator = false;

    // Proprietário da plataforma: acesso administrativo máximo, nunca concedido pelo cliente.
    @Column(nullable = false)
    private boolean isOwner = false;

    // Assinatura VIP da Plataforma (Remove 100% dos anúncios)
    @Column(nullable = false)
    private boolean isVip = false;

    private LocalDateTime vipExpiresAt;

    // Consentimento e Conformidade LGPD (Art. 7º, I e Art. 8º)
    private LocalDateTime termsAcceptedAt;

    @Column(length = 20)
    private String privacyPolicyVersion;

    // Data de nascimento para controle de maioridade (Art. 14 da LGPD)
    private java.time.LocalDate birthDate;

    // Instante em que o titular configurou o perfil (foto/visibilidade).
    // É o sinal de que o primeiro acesso (montar o perfil) ja aconteceu.
    private java.time.LocalDateTime profileOnboardingCompletedAt;

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

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Sex getSex() { return sex; }
    public void setSex(Sex sex) { this.sex = sex; }

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

    public LocalDateTime getEmailVerifiedAt() { return emailVerifiedAt; }
    public void setEmailVerifiedAt(LocalDateTime emailVerifiedAt) { this.emailVerifiedAt = emailVerifiedAt; }

    public String getTwoFactorSecret() { return twoFactorSecret; }
    public void setTwoFactorSecret(String twoFactorSecret) { this.twoFactorSecret = twoFactorSecret; }

    public Set<WorkEntity> getLikedWorks() { return likedWorks; }
    public void setLikedWorks(Set<WorkEntity> likedWorks) { this.likedWorks = likedWorks; }

    public boolean isModerator() { return isModerator; }
    public void setModerator(boolean moderator) { isModerator = moderator; }

    public boolean isOwner() { return isOwner; }
    public void setOwner(boolean owner) { isOwner = owner; }

    public boolean isVip() { return isVip; }
    public void setVip(boolean vip) { isVip = vip; }

    public LocalDateTime getVipExpiresAt() { return vipExpiresAt; }
    public void setVipExpiresAt(LocalDateTime vipExpiresAt) { this.vipExpiresAt = vipExpiresAt; }

    public boolean isVipActive() {
        return isVip && vipExpiresAt != null && vipExpiresAt.isAfter(LocalDateTime.now());
    }

    public LocalDateTime getTermsAcceptedAt() { return termsAcceptedAt; }
    public void setTermsAcceptedAt(LocalDateTime termsAcceptedAt) { this.termsAcceptedAt = termsAcceptedAt; }

    public String getPrivacyPolicyVersion() { return privacyPolicyVersion; }
    public void setPrivacyPolicyVersion(String privacyPolicyVersion) { this.privacyPolicyVersion = privacyPolicyVersion; }

    public java.time.LocalDate getBirthDate() { return birthDate; }

    public java.time.LocalDateTime getProfileOnboardingCompletedAt() { return profileOnboardingCompletedAt; }
    public void setProfileOnboardingCompletedAt(java.time.LocalDateTime value) { this.profileOnboardingCompletedAt = value; }
    public void setBirthDate(java.time.LocalDate birthDate) { this.birthDate = birthDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
