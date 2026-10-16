package com.manganetworking.service.user;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.ReadingProgressDocument;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import com.manganetworking.service.reading.ReadingProgressService;
import com.manganetworking.service.user.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class UserProfileApplicationService {

    private final UserRepository userRepository;
    private final WorkRepository workRepository;
    private final ReadingProgressMongoRepository progressRepository;
    private final ReadingProgressService readingProgressService;

    public UserProfileApplicationService(
            UserRepository userRepository,
            WorkRepository workRepository,
            ReadingProgressMongoRepository progressRepository,
            ReadingProgressService readingProgressService
    ) {
        this.userRepository = userRepository;
        this.workRepository = workRepository;
        this.progressRepository = progressRepository;
        this.readingProgressService = readingProgressService;
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

    public List<ReadingProgressDocument> getReadingHistory(String currentUserId) {
        return progressRepository.findAllByUserIdOrderByUpdatedAtDesc(currentUserId);
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

        List<ReadingProgressDocument> readingHistory = progressRepository.findAllByUserIdOrderByUpdatedAtDesc(currentUserId.toString());

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
     * Anonimiza dados pessoais enquanto preserva integridade fiscal do ledger de transações.
     */
    @Transactional
    public void deleteUserAccountLgpd(UUID currentUserId) {
        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + currentUserId));

        // 1. Anonimizar credenciais e dados cadastrais no PostgreSQL
        user.setName("Usuário Removido (LGPD)");
        user.setEmail("anon-" + user.getId() + "@deleted.manganetworking");
        user.setAvatarUrl(null);
        user.setPasswordHash(null);
        user.setTwoFactorEnabled(false);
        user.setTwoFactorSecret(null);
        user.setProfilePublic(false);
        user.getLikedWorks().clear();
        userRepository.save(user);

        // 2. Excluir telemetria e progresso de leitura no MongoDB
        progressRepository.deleteAllByUserId(currentUserId.toString());
    }
}
