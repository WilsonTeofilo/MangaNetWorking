package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.CreatorMissionDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;

import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.CreatorMissionMongoRepository;
import com.manganetworking.service.monetization.MonetizationService;
import com.manganetworking.service.creator.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class CreatorApplicationService {

    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final CreatorMissionMongoRepository missionRepository;
    private final MonetizationService monetizationService;
    private final com.manganetworking.service.mfa.TwoFactorAuthService twoFactorAuthService;

    public CreatorApplicationService(
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            CreatorMissionMongoRepository missionRepository,
            MonetizationService monetizationService,
            com.manganetworking.service.mfa.TwoFactorAuthService twoFactorAuthService
    ) {
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.missionRepository = missionRepository;
        this.monetizationService = monetizationService;
        this.twoFactorAuthService = twoFactorAuthService;
    }


    @Transactional(readOnly = true)
    public CreatorPublicProfileResponseDto getPublicCreatorProfile(String handle) {
        String cleanHandle = handle.startsWith("@") ? handle.substring(1) : handle;
        CreatorEntity creator = creatorRepository.findByHandle(cleanHandle)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado: @" + cleanHandle));

        List<WorkEntity> works = workRepository.findAllByAuthorId(creator.getId());

        List<CreatorWorkSummaryDto> worksDto = works.stream()
                .map(w -> new CreatorWorkSummaryDto(
                        w.getId(),
                        w.getTitle(),
                        w.getSlug(),
                        w.getSynopsis(),
                        w.getCoverUrl(),
                        w.getTotalChapters(),
                        w.getTotalViews(),
                        w.getTotalLikes()
                ))
                .toList();

        return new CreatorPublicProfileResponseDto(
                creator.getId(),
                creator.getUser() != null ? creator.getUser().getName() : creator.getHandle(),
                "@" + creator.getHandle(),
                creator.getBio(),
                creator.getAvatarUrl(),
                creator.getInstagramUrl(),
                creator.getYoutubeUrl(),
                creator.getPortfolioUrl(),
                creator.getMembershipPriceBrl(),
                creator.isMonetizationUnlocked(),
                worksDto
        );
    }

    @Transactional(readOnly = true)
    public CreatorWorkspaceResponseDto getCreatorWorkspace(UUID creatorId) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        List<CreatorMissionDocument> missions = missionRepository.findAllByCreatorId(creator.getId().toString());

        return new CreatorWorkspaceResponseDto(
                creator.getId(),
                creator.getUser() != null ? creator.getUser().getName() : creator.getHandle(),
                "@" + creator.getHandle(),
                creator.getMonetizationLevel(),
                creator.isMonetizationUnlocked(),
                creator.getWalletBalanceBrl(),
                creator.getTotalDonationsBrl(),
                creator.getMonthlyMembersCount(),
                creator.getMembershipPriceBrl(),
                creator.getPixKey(),
                creator.getPixKeyType(),
                creator.hasActiveBoost(),
                creator.getEngagementBoostMul(),
                missions
        );
    }

    @Transactional
    public void updateCreatorIdentity(UUID creatorId, UpdateCreatorIdentityRequestDto dto) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        if (dto.name() != null && !dto.name().isBlank() && creator.getUser() != null) {
            creator.getUser().setName(com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.name().trim()));
        }
        if (dto.bio() != null) creator.setBio(com.manganetworking.util.SanitizationUtils.sanitizeText(dto.bio().trim()));
        if (dto.instagramUrl() != null) creator.setInstagramUrl(dto.instagramUrl().trim());
        if (dto.youtubeUrl() != null) creator.setYoutubeUrl(dto.youtubeUrl().trim());
        if (dto.portfolioUrl() != null) creator.setPortfolioUrl(dto.portfolioUrl().trim());
        if (dto.avatarUrl() != null) creator.setAvatarUrl(dto.avatarUrl().trim());

        creatorRepository.save(creator);
    }

    @Transactional
    public BigDecimal updateMembershipPrice(UUID creatorId, BigDecimal newPriceBrl) {
        CreatorEntity updated = monetizationService.updateMembershipPrice(creatorId, newPriceBrl);
        return updated.getMembershipPriceBrl();
    }

    /**
     * Atualização de Chave PIX de Recebimento com Step-Up 2FA Obrigatório (AppSec / OWASP)
     */
    @Transactional
    public void updatePixKey(UUID creatorId, UpdatePixKeyRequestDto dto) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        UserEntity user = creator.getUser();
        if (user == null) {
            throw new ResourceNotFoundException("Usuário vinculado ao criador não encontrado");
        }

        // Validação obrigatória de Step-Up Authentication com o código OTP de 2FA
        boolean codeValid = twoFactorAuthService.verifyOtp(user.getEmail(), dto.twoFactorCode().trim());
        if (!codeValid) {
            throw new SecurityException("Código 2FA inválido ou expirado. Operação de segurança abortada.");
        }

        creator.setPixKey(dto.pixKey().trim());
        creator.setPixKeyType(dto.pixKeyType());
        creatorRepository.save(creator);
    }


    /**
     * Resgata a recompensa da missão da Season cumprida pelo autor, aplicando o Boost no Algoritmo do Feed
     */
    @Transactional
    public CreatorEntity claimMissionReward(UUID creatorId, String missionId) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado: " + creatorId));

        CreatorMissionDocument mission = missionRepository.findById(missionId)
                .orElseThrow(() -> new ResourceNotFoundException("Missão não encontrada: " + missionId));

        if (!mission.getCreatorId().equals(creatorId.toString())) {
            throw new com.manganetworking.config.exception.AccessDeniedException("Esta missão pertence a outro autor.");
        }

        if (mission.isCompleted()) {
            throw new IllegalStateException("Esta missão já foi resgatada anteriormente.");
        }

        if (mission.getCurrentProgress() < mission.getTargetGoal()) {
            throw new IllegalStateException("Missão ainda não concluída. Progresso: "
                    + mission.getCurrentProgress() + "/" + mission.getTargetGoal());
        }

        mission.setCompleted(true);
        mission.setCompletedAt(java.time.Instant.now());
        missionRepository.save(mission);

        // Aplica o Boost de Algoritmo ganho na Season
        double rewardMul = mission.getBoostRewardMultiplier() != null ? mission.getBoostRewardMultiplier() : 1.5;
        int durationHours = mission.getBoostDurationHours() != null ? mission.getBoostDurationHours() : 48;

        creator.setEngagementBoostMul(rewardMul);
        creator.setEngagementBoostUntil(java.time.LocalDateTime.now().plusHours(durationHours));

        // Se atingiu metas da temporada, avança nível de monetização (exige maioridade de 18 anos - Art. 14 da LGPD)
        if (creator.getMonetizationLevel() < 2 && mission.getTargetGoal() >= 3) {
            UserEntity user = creator.getUser();
            if (user != null && user.getBirthDate() != null) {
                int age = java.time.Period.between(user.getBirthDate(), java.time.LocalDate.now()).getYears();
                if (age < 18) {
                    throw new com.manganetworking.config.exception.AccessDeniedException(
                            "A monetização financeira exige maioridade legal (18+ anos). Idade atual: " + age + " anos.");
                }
            }
            creator.setMonetizationLevel(2);
        }

        return creatorRepository.save(creator);
    }
}
