package com.manganetworking.service.user;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.reading.ReadingProgressService;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.FileStorageService;
import com.manganetworking.service.storage.ProfileAvatarUrlPolicy;
import com.manganetworking.service.user.dto.*;
import com.manganetworking.util.StorageFileNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserProfileApplicationService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileApplicationService.class);

    private final UserRepository userRepository;
    private final WorkRepository workRepository;
    private final ReadingProgressMongoRepository progressRepository;
    private final EngagementEventMongoRepository engagementEventRepository;
    private final ReadingProgressService readingProgressService;
    private final CreatorRepository creatorRepository;
    private final FileStorageService fileStorageService;
    private final SessionService sessionService;
    private final JdbcTemplate jdbcTemplate;
    private final PrivacyComplianceService privacyComplianceService;
    private final AccountIdentityService accountIdentityService;

    public UserProfileApplicationService(
            UserRepository userRepository,
            WorkRepository workRepository,
            ReadingProgressMongoRepository progressRepository,
            EngagementEventMongoRepository engagementEventRepository,
            ReadingProgressService readingProgressService,
            CreatorRepository creatorRepository,
            FileStorageService fileStorageService,
            SessionService sessionService,
            JdbcTemplate jdbcTemplate,
            PrivacyComplianceService privacyComplianceService,
            AccountIdentityService accountIdentityService
    ) {
        this.userRepository = userRepository;
        this.workRepository = workRepository;
        this.progressRepository = progressRepository;
        this.engagementEventRepository = engagementEventRepository;
        this.readingProgressService = readingProgressService;
        this.creatorRepository = creatorRepository;
        this.fileStorageService = fileStorageService;
        this.sessionService = sessionService;
        this.jdbcTemplate = jdbcTemplate;
        this.privacyComplianceService = privacyComplianceService;
        this.accountIdentityService = accountIdentityService;
    }

    @Transactional(readOnly = true)
    public ReaderProfileResponseDto getReaderProfile(UUID targetUserId, UUID currentUserId) {
        UserEntity user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + targetUserId));

        boolean isSelf = currentUserId != null && currentUserId.equals(targetUserId);

        // Se o perfil for privado e não for o próprio dono acessando, bloqueia autoritativamente no servidor
        if (!isSelf && !user.isProfilePublic()) {
            throw new AccessDeniedException("Este perfil de leitor é privado pelo usuário.");
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM. 'de' yyyy", Locale.forLanguageTag("pt-BR"));
        String memberSince = user.getCreatedAt().format(formatter);

        List<LikedWorkSummaryDto> likedWorks = user.getLikedWorks().stream()
                .map(work -> new LikedWorkSummaryDto(
                        work.getId(),
                        work.getTitle(),
                        work.getSlug(),
                        work.getCoverUrl(),
                        work.getAuthor() != null ? work.getAuthor().getHandle() : ""
                ))
                .toList();

        return new ReaderProfileResponseDto(
                user.getId(),
                user.getName(),
                user.getAvatarUrl(),
                user.isProfilePublic(),
                user.isCreator(),
                memberSince,
                user.getLikedWorks().size(),
                likedWorks
        );
    }

    @Transactional
    public void updateProfile(UUID currentUserId, UpdateProfileRequestDto dto) {
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        if (dto.name() != null && !dto.name().isBlank()) {
            user.setName(com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.name().trim()));
        }
        if (dto.avatarUrl() != null) {
            user.setAvatarUrl(ProfileAvatarUrlPolicy.validate(dto.avatarUrl()));
        }
        if (dto.username() != null && !dto.username().isBlank()) {
            accountIdentityService.claimUsername(currentUserId, dto.username());
        }
      if (dto.isProfilePublic() != null) {
        // Perfil de ESCRITOR e sempre publico: quem publica precisa ser encontrado
        // pelos leitores. A conta de leitor continua podendo ficar privada.
        if (Boolean.FALSE.equals(dto.isProfilePublic()) && user.isCreator()) {
          throw new IllegalArgumentException("Perfil de escritor é sempre público.");
        }
            user.setProfilePublic(dto.isProfilePublic());
        }

        // Salvar o perfil (foto, nome ou visibilidade) encerra o primeiro acesso.
      if (user.getProfileOnboardingCompletedAt() == null) {
        user.setProfileOnboardingCompletedAt(java.time.LocalDateTime.now());
      }
      userRepository.save(user);
    }

    @Transactional
    public ToggleLikeResponseDto toggleLikeWork(UUID currentUserId, UUID workId) {
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada com ID: " + workId));

        boolean alreadyLiked = user.getLikedWorks().contains(work);
        if (alreadyLiked) {
            user.getLikedWorks().remove(work);
            work.setTotalLikes(Math.max(0, work.getTotalLikes() - 1));
        } else {
            user.getLikedWorks().add(work);
            work.setTotalLikes(work.getTotalLikes() + 1);
        }

        userRepository.save(user);
        workRepository.save(work);

        return new ToggleLikeResponseDto(!alreadyLiked, work.getTotalLikes());
    }

    /**
     * Biblioteca do leitor: as obras favoritadas, com o resumo que o card precisa.
     * A identidade vem sempre da sessão; nenhum id de usuário é aceito do cliente.
     */
    @Transactional(readOnly = true)
    public List<LibraryWorkDto> getLibrary(UUID currentUserId) {
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + currentUserId));

        return user.getLikedWorks().stream()
                .filter(work -> work != null && work.getId() != null)
                .map(work -> new LibraryWorkDto(
                        work.getId(),
                        work.getTitle(),
                        work.getSlug(),
                        work.getCoverUrl(),
                        work.getAuthor() != null && work.getAuthor().getUser() != null
                                ? work.getAuthor().getUser().getName()
                                : "",
                        work.getAuthor() != null ? work.getAuthor().getHandle() : "",
                        work.getTotalChapters() == null ? 0 : work.getTotalChapters(),
                        work.getStatus()
                ))
                .sorted(Comparator.comparing(LibraryWorkDto::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    public List<ReadingProgressResponseDto> getReadingHistory(String currentUserId) {
        return progressRepository.findAllByUserIdOrderByUpdatedAtDesc(currentUserId).stream()
                .map(ReadingProgressResponseDto::from)
                .toList();
    }

    public TrackPageResponseDto trackPage(String currentUserId, TrackPageRequestDto dto) {
        ReadingProgressService.ReadingProgressResult result = readingProgressService.trackPageRead(
                currentUserId,
                dto.workId(),
                dto.chapterId(),
                dto.page(),
                dto.totalPages()
        );

        return new TrackPageResponseDto(result.progress().getPage(), result.triggerAd());
    }

    /**
     * Direito de Portabilidade do Titular de Dados (Art. 18, V da LGPD)
     */
    @Transactional
    public UserDataExportDto exportUserData(UUID currentUserId) {
        return exportUserData(currentUserId, null);
    }

    @Transactional
    public UserDataExportDto exportUserData(UUID currentUserId, String remoteIp) {
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + currentUserId));

        List<LikedWorkSummaryDto> likedWorks = user.getLikedWorks().stream()
                .map(work -> new LikedWorkSummaryDto(
                        work.getId(),
                        work.getTitle(),
                        work.getSlug(),
                        work.getCoverUrl(),
                        work.getAuthor() != null ? work.getAuthor().getHandle() : ""
                ))
                .toList();

        List<ReadingProgressResponseDto> readingHistory = progressRepository
                .findAllByUserIdOrderByUpdatedAtDesc(currentUserId.toString()).stream()
                .map(ReadingProgressResponseDto::from)
                .toList();

        List<java.util.Map<String, Object>> consentHistory = jdbcTemplate.queryForList(
                "SELECT policy_version, purpose, accepted_at, remote_ip, user_agent " +
                        "FROM privacy_consent_events WHERE user_id = ? ORDER BY accepted_at", currentUserId);
        List<java.util.Map<String, Object>> financialHistory = jdbcTemplate.queryForList("""
                SELECT record_type, amount_brl, status, created_at, counterparty FROM (
                    SELECT 'DONATION' AS record_type, d.gross_amount_brl AS amount_brl, d.status,
                           d.created_at, c.handle AS counterparty
                    FROM donations d JOIN creators c ON c.id = d.creator_id WHERE d.donor_user_id = ?
                    UNION ALL
                    SELECT 'MEMBERSHIP', m.monthly_price_brl, m.status, m.created_at, c.handle
                    FROM membership_subscriptions m JOIN creators c ON c.id = m.creator_id
                    WHERE m.subscriber_user_id = ?
                    UNION ALL
                    SELECT l.transaction_type, l.gross_amount_brl, 'CONFIRMED', l.created_at,
                           COALESCE(c.handle, 'MangaNetWorking')
                    FROM financial_ledger l LEFT JOIN creators c ON c.id = l.creator_id WHERE l.user_id = ?
                ) history ORDER BY created_at
                """, currentUserId, currentUserId, currentUserId);

        privacyComplianceService.auditRequest(currentUserId, "DATA_EXPORT", remoteIp);

        return new UserDataExportDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.isCreator(),
                user.isVipActive(),
                user.getCreatedAt(),
                user.getBirthDate(),
                user.isProfilePublic(),
                user.getTermsAcceptedAt(),
                user.getPrivacyPolicyVersion(),
                likedWorks,
                readingHistory,
                consentHistory,
                financialHistory
        );
    }

    /**
     * Direito ao Esquecimento / Eliminação dos Dados Pessoais (Art. 18, VI da LGPD)
     * <p>
     * Anonimiza dados pessoais no PostgreSQL, remove as imagens pessoais do storage e revoga
     * as sessões ativas, preservando apenas a integridade fiscal do ledger de transações
     * (que guarda valores, não CPF/PIX). Sem a revogação, o cookie emitido antes da exclusão
     * continuaria autenticando o titular por até 24h e manteria nome/e-mail em memória.
     * </p>
     */
    @Transactional
    public void deleteUserAccountLgpd(UUID currentUserId) {
        deleteUserAccountLgpd(currentUserId, null);
    }

    @Transactional
    public void deleteUserAccountLgpd(UUID currentUserId, String remoteIp) {
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + currentUserId));

        // Só revoga/anonimiza depois que a mídia identificável foi fisicamente removida.
        deleteStoredFileStrictly(user.getAvatarUrl());
        creatorRepository.findByUserId(currentUserId).ifPresent(creator -> deleteStoredFileStrictly(creator.getAvatarUrl()));
        sessionService.revokeSessionsForUser(currentUserId);

        // 3. Anonimizar credenciais e dados cadastrais no PostgreSQL
        user.setName("Usuário Removido (LGPD)");
        user.setEmail("anon-" + user.getId() + "@deleted.manganetworking");
        user.setAvatarUrl(null);
        user.setPasswordHash(null);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        user.setEmailVerifiedAt(null);
        user.setProfilePublic(false);
        // A anonimização é também remoção de privilégios: uma conta excluída não pode
        // conservar poderes administrativos, criador, VIP ou dados de nascimento.
        user.setModerator(false);
        user.setOwner(false);
        user.setCreator(false);
        user.setVip(false);
        user.setVipExpiresAt(null);
        user.setBirthDate(null);
        user.getLikedWorks().clear();
        userRepository.save(user);

        // Mensagens livres podem conter dados pessoais; os registros contábeis permanecem íntegros.
        jdbcTemplate.update("UPDATE donations SET message = NULL WHERE donor_user_id = ?", currentUserId);

        // 4. Anonimizar o perfil público de criador (CPF, PIX, handle, bio, redes e avatar).
        //    CPF/PIX/handle são NOT NULL no schema; o placeholder preserva a integridade sem
        //    identificar o titular. O handle anonimizado usa o UUID completo para não colidir
        //    com o índice único de creators.handle.
        creatorRepository.findByUserId(currentUserId).ifPresent(creator -> anonymizeCreator(creator));

        // 5. Expurgar progresso e eventos de engajamento vinculados ao titular no MongoDB.
        progressRepository.deleteAllByUserId(currentUserId.toString());
        engagementEventRepository.deleteAllByUserId(currentUserId.toString());
        privacyComplianceService.auditRequest(currentUserId, "ACCOUNT_DELETE", remoteIp);
    }

    @Transactional
    public void acceptCurrentPrivacyPolicy(UUID userId, String version, String remoteIp, String userAgent) {
        if (!privacyComplianceService.currentPolicyVersion().equals(version)) {
            throw new IllegalArgumentException("A política mudou durante o aceite; atualize a página e tente novamente.");
        }
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        user.setTermsAcceptedAt(java.time.LocalDateTime.now());
        user.setPrivacyPolicyVersion(version);
        userRepository.save(user);
        privacyComplianceService.recordConsent(userId, version, "POLICY_REACCEPTANCE", remoteIp, userAgent);
    }

    private void anonymizeCreator(CreatorEntity creator) {
        String anonymousSuffix = creator.getId() != null ? creator.getId().toString() : UUID.randomUUID().toString();

        creator.setAvatarUrl(null);
        creator.setBio(null);
        creator.setInstagramUrl(null);
        creator.setYoutubeUrl(null);
        creator.setPortfolioUrl(null);
        creator.setDocumentCpf("ANONIMIZADO-" + anonymousSuffix);
        creator.setPixKey("ANONIMIZADO-" + anonymousSuffix);
        creator.setHandle("anon-" + anonymousSuffix);
        creatorRepository.save(creator);

        // Despublicação de Obras no Direito ao Esquecimento (Art. 18, VI da LGPD):
        // Interrompe a distribuição pública das obras criadas pelo autor excluído
        List<WorkEntity> authorWorks = workRepository.findAllByAuthorId(creator.getId());
        for (WorkEntity work : authorWorks) {
            work.setStatus("archived_lgpd");
            workRepository.save(work);
            log.info("[LGPD] Obra '{}' ({}) arquivada após exclusão de conta do autor.", work.getTitle(), work.getId());
        }
    }


    /** Exclui apenas arquivos próprios; URL inválida ou falha física interrompe a exclusão. */
    private void deleteStoredFileStrictly(String storedUrl) {
        if (storedUrl == null
                || !(storedUrl.startsWith("/api/storage/") || storedUrl.startsWith("/api/uploads/"))) {
            return;
        }
        String filename = StorageFileNames.fromPageToken(storedUrl);
        if (filename == null) throw new IllegalStateException("Referência de avatar local inválida; exclusão interrompida.");
        try {
            fileStorageService.deleteFile(filename);
            if (fileStorageService.exists(filename)) {
                throw new IllegalStateException("O arquivo de avatar ainda existe no storage após a tentativa de exclusão.");
            }
        } catch (RuntimeException exception) {
            log.error("[LGPD] Exclusão interrompida: falha ao remover avatar '{}' do storage.", filename, exception);
            throw new IllegalStateException("Não foi possível apagar o avatar. A exclusão da conta não foi concluída.", exception);
        }
    }
}
