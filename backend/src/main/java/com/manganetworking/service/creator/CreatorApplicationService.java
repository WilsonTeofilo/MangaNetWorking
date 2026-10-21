package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.CreatorMissionDocument;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;

import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.CreatorPixKeyAuditRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.CreatorMissionMongoRepository;
import com.manganetworking.service.monetization.MonetizationService;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.storage.ProfileAvatarUrlPolicy;
import com.manganetworking.service.creator.dto.*;
import com.manganetworking.util.CpfValidator;
import com.manganetworking.domain.value.SocialLinks;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class CreatorApplicationService {

    private final CreatorRepository creatorRepository;
    private final CreatorPixKeyAuditRepository pixKeyAuditRepository;
    private final WorkRepository workRepository;
    private final CreatorMissionMongoRepository missionRepository;
    private final MonetizationService monetizationService;
    private final TwoFactorAuthService twoFactorAuthService;
    private final UserRepository userRepository;
    private final CreatorProfileFactory creatorProfileFactory;

    public CreatorApplicationService(
            CreatorRepository creatorRepository,
            CreatorPixKeyAuditRepository pixKeyAuditRepository,
            WorkRepository workRepository,
            CreatorMissionMongoRepository missionRepository,
            MonetizationService monetizationService,
            TwoFactorAuthService twoFactorAuthService,
            UserRepository userRepository,
            CreatorProfileFactory creatorProfileFactory
    ) {
        this.creatorRepository = creatorRepository;
        this.pixKeyAuditRepository = pixKeyAuditRepository;
        this.workRepository = workRepository;
        this.missionRepository = missionRepository;
        this.monetizationService = monetizationService;
        this.twoFactorAuthService = twoFactorAuthService;
        this.userRepository = userRepository;
        this.creatorProfileFactory = creatorProfileFactory;
    }

    /**
     * Transição de leitor para escritor.
     *
     * <p>Leitor só lê, curte, comenta e usa a biblioteca. Quem quiser publicar assume o perfil
     * de escritor e precisa declarar <strong>pelo menos um vínculo social</strong> — é o que dá
     * identidade pública verificável ao perfil e evita perfis de fachada. O CPF é opcional:
     * só é exigido para monetizar.</p>
     */
    @Transactional
    public CreatorEntity applyAsWriter(UUID userId, ApplyAsCreatorRequestDto dto) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        if (creatorRepository.findByUserId(userId).isPresent()) {
            throw new IllegalArgumentException("Você já tem um perfil de escritor.");
        }

        SocialLinks links = SocialLinks.of(dto.instagramUrl(), dto.youtubeUrl(), dto.portfolioUrl());


        String cpf = dto.cpf() == null || dto.cpf().isBlank() ? null : dto.cpf().replaceAll("\\D", "");
        if (cpf != null && !CpfValidator.isValid(cpf)) {
            throw new IllegalArgumentException("O CPF informado é inválido.");
        }

        // O identificador publico do autor e o username da propria conta de leitor
        // (reciclado): nao existe segundo handle para o usuario escolher, e o username
        // ja e unico - logo nao nasce duplicidade.
        String handle = user.getUsername() == null ? null : user.getUsername().trim().replace("@", "");
        if (handle == null || handle.isBlank()) {
            throw new IllegalArgumentException("Defina um username em Minha conta antes de criar o perfil de escritor.");
        }
        if (creatorRepository.findByHandle(handle).isPresent()) {
            throw new IllegalArgumentException("Este username ja e o identificador de outro autor. Troque o username em Minha conta.");
        }

        CreatorEntity creator = creatorProfileFactory.create(user, links, cpf);
        creatorRepository.save(creator);

        user.setCreator(true);
        userRepository.save(user);

        return creator;
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
                creator.getAvatarUrl(),
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
        if (dto.bio() != null) creator.setBio(com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.bio().trim()));
        if (dto.instagramUrl() != null) creator.setInstagramUrl(CreatorProfileUrlPolicy.instagram(dto.instagramUrl()));
        if (dto.youtubeUrl() != null) creator.setYoutubeUrl(CreatorProfileUrlPolicy.youtube(dto.youtubeUrl()));
        if (dto.portfolioUrl() != null) creator.setPortfolioUrl(CreatorProfileUrlPolicy.portfolio(dto.portfolioUrl()));
        if (dto.avatarUrl() != null) creator.setAvatarUrl(ProfileAvatarUrlPolicy.validate(dto.avatarUrl()));

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
        updatePixKey(creatorId, dto, "unknown");
    }

    @Transactional
    public void updatePixKey(UUID creatorId, UpdatePixKeyRequestDto dto, String clientIp) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        UserEntity user = creator.getUser();
        if (user == null) {
            throw new ResourceNotFoundException("Usuário vinculado ao criador não encontrado");
        }

        // Validação obrigatória de Step-Up Authentication com o código OTP de 2FA
        boolean codeValid = twoFactorAuthService.verifyOtp(
                user.getEmail(), dto.twoFactorCode().trim(), TwoFactorAuthService.OtpPurpose.STEP_UP_PIX);
        if (!codeValid) {
            throw new SecurityException("Código 2FA inválido ou expirado. Operação de segurança abortada.");
        }

        String previousKey = creator.getPixKey();
        var previousType = creator.getPixKeyType();
        String nextKey = dto.pixKey().trim();
        creator.setPixKey(nextKey);
        creator.setPixKeyType(dto.pixKeyType());
        creatorRepository.save(creator);
        pixKeyAuditRepository.save(new com.manganetworking.domain.relational.CreatorPixKeyAuditEntity(
                creator.getId(), user.getId(), previousType != null ? previousType.name() : null,
                maskPixKey(previousKey), dto.pixKeyType().name(), maskPixKey(nextKey),
                normalizeClientIp(clientIp)));
    }

    private String maskPixKey(String key) {
        if (key == null || key.isBlank() || key.trim().length() <= 4) return "****";
        return "****" + key.trim().substring(key.trim().length() - 4);
    }

    private String normalizeClientIp(String clientIp) {
        return clientIp == null || clientIp.isBlank() ? "unknown" : clientIp.substring(0, Math.min(45, clientIp.length()));
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

        // Se atingiu metas da temporada, avança nível de monetização (exige maioridade comprovada de 18 anos - Art. 14 da LGPD)
        if (creator.getMonetizationLevel() < 2 && mission.getTargetGoal() >= 3) {
            UserEntity user = creator.getUser();
            if (user == null || user.getBirthDate() == null) {
                throw new com.manganetworking.config.exception.AccessDeniedException(
                        "Para desbloquear a monetização (Nível 2), é obrigatório cadastrar a data de nascimento e comprovar maioridade legal (18+ anos).");
            }
            int age = java.time.Period.between(user.getBirthDate(), java.time.LocalDate.now()).getYears();
            if (age < 18) {
                throw new com.manganetworking.config.exception.AccessDeniedException(
                        "A monetização financeira exige maioridade legal (18+ anos). Idade atual: " + age + " anos.");
            }
            creator.setMonetizationLevel(2);
        }

        return creatorRepository.save(creator);
    }
}
