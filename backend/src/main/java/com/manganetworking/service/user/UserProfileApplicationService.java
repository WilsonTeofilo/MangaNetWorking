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
import com.manganetworking.service.reading.ReadingProgressService;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.FileStorageService;
import com.manganetworking.service.user.dto.*;
import com.manganetworking.util.StorageFileNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserProfileApplicationService {

    private static final Logger log = LoggerFactory.getLogger(UserProfileApplicationService.class);

    private final UserRepository userRepository;
    private final WorkRepository workRepository;
    private final ReadingProgressMongoRepository progressRepository;
    private final ReadingProgressService readingProgressService;
    private final CreatorRepository creatorRepository;
    private final FileStorageService fileStorageService;
    private final SessionService sessionService;

    public UserProfileApplicationService(
            UserRepository userRepository,
            WorkRepository workRepository,
            ReadingProgressMongoRepository progressRepository,
            ReadingProgressService readingProgressService,
            CreatorRepository creatorRepository,
            FileStorageService fileStorageService,
            SessionService sessionService
    ) {
        this.userRepository = userRepository;
        this.workRepository = workRepository;
        this.progressRepository = progressRepository;
        this.readingProgressService = readingProgressService;
        this.creatorRepository = creatorRepository;
        this.fileStorageService = fileStorageService;
        this.sessionService = sessionService;
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
            user.setAvatarUrl(dto.avatarUrl().trim());
        }
        if (dto.isProfilePublic() != null) {
            user.setProfilePublic(dto.isProfilePublic());
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
    @Transactional(readOnly = true)
    public UserDataExportDto exportUserData(UUID currentUserId) {
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

        return new UserDataExportDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl(),
                user.isCreator(),
                user.isVipActive(),
                user.getCreatedAt(),
                likedWorks,
                readingHistory
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
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + currentUserId));

        // 1. Revogar sessões antes de qualquer alteração (invalida o cookie imediatamente)
        sessionService.revokeSessionsForUser(currentUserId);

        // 2. Remover a imagem de perfil do titular do storage (dado pessoal biométrico/facial)
        deleteStoredFileQuietly(user.getAvatarUrl());

        // 3. Anonimizar credenciais e dados cadastrais no PostgreSQL
        user.setName("Usuário Removido (LGPD)");
        user.setEmail("anon-" + user.getId() + "@deleted.manganetworking");
        user.setAvatarUrl(null);
        user.setPasswordHash(null);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        user.setProfilePublic(false);
        user.getLikedWorks().clear();
        userRepository.save(user);

        // 4. Anonimizar o perfil público de criador (CPF, PIX, handle, bio, redes e avatar).
        //    CPF/PIX/handle são NOT NULL no schema; o placeholder preserva a integridade sem
        //    identificar o titular. O handle anonimizado usa o UUID completo para não colidir
        //    com o índice único de creators.handle.
        creatorRepository.findByUserId(currentUserId).ifPresent(creator -> anonymizeCreator(creator));

        // 5. Excluir telemetria e progresso de leitura no MongoDB
        progressRepository.deleteAllByUserId(currentUserId.toString());
    }

    private void anonymizeCreator(CreatorEntity creator) {
        String anonymousSuffix = creator.getId() != null ? creator.getId().toString() : UUID.randomUUID().toString();

        deleteStoredFileQuietly(creator.getAvatarUrl());
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


    /**
     * Remove um arquivo do storage sem interromper a exclusão da conta quando o binário já não
     * existe ou o storage está indisponível (a obrigação legal é apagar o dado, não falhar o fluxo).
     * <p>
     * Só apaga caminhos servidos pela própria plataforma: {@code avatarUrl} aceita qualquer URL
     * externa no cadastro, e extrair o último segmento de uma URL de terceiros poderia apagar um
     * arquivo local homônimo pertencente a outra obra/usuário.
     * </p>
     */
    private void deleteStoredFileQuietly(String storedUrl) {
        if (storedUrl == null
                || !(storedUrl.startsWith("/api/storage/") || storedUrl.startsWith("/api/uploads/"))) {
            return;
        }
        String filename = StorageFileNames.fromPageToken(storedUrl);
        if (filename == null) {
            return;
        }
        try {
            fileStorageService.deleteFile(filename);
        } catch (RuntimeException exception) {
            log.warn("[LGPD] Falha ao remover arquivo '{}' do storage: {}", filename, exception.getMessage());
        }
    }
}
