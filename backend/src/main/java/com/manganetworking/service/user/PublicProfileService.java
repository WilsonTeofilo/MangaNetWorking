package com.manganetworking.service.user;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.enums.WorkStatus;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorFollowRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.user.dto.PublicProfileResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Perfil público de um usuário (leitor ou escritor).
 *
 * <p>Duas regras que a plataforma não negocia:</p>
 * <ol>
 *   <li><strong>Privacidade:</strong> perfil privado não expõe nome, avatar, links, obras
 *       nem contadores — apenas o username, que é o que aparece nos comentários.</li>
 *   <li><strong>Seguidores só para escritores:</strong> leitor não tem seguidores; a
 *       contagem e a ação de seguir existem apenas quando existe perfil de escritor.</li>
 * </ol>
 */
@Service
public class PublicProfileService {

    private final UserRepository userRepository;
    private final CreatorRepository creatorRepository;
    private final CreatorFollowRepository followRepository;
    private final WorkRepository workRepository;

    public PublicProfileService(
            UserRepository userRepository,
            CreatorRepository creatorRepository,
            CreatorFollowRepository followRepository,
            WorkRepository workRepository
    ) {
        this.userRepository = userRepository;
        this.creatorRepository = creatorRepository;
        this.followRepository = followRepository;
        this.workRepository = workRepository;
    }

    @Transactional(readOnly = true)
    public PublicProfileResponseDto getPublicProfile(String rawUsername) {
        String username = rawUsername == null ? "" : rawUsername.trim().replace("@", "");
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("Perfil não encontrado: @" + username));

        if (!user.isProfilePublic()) {
            // Perfil privado: só o username e a própria informação de que ele é privado.
            return new PublicProfileResponseDto(
                    user.getUsername(), null, null, user.isCreator(), false, null, null,
                    null, null, null, 0, 0, 0, user.getCreatedAt());
        }

        CreatorEntity creator = creatorRepository.findByUserId(user.getId()).orElse(null);
        long followerCount = creator == null ? 0 : followRepository.countByCreatorId(creator.getId());
        long publicWorkCount = creator == null ? 0 : countPublicWorks(creator.getId());
        long likedWorkCount = userRepository.countLikedWorks(user.getId());

        return new PublicProfileResponseDto(
                user.getUsername(),
                user.getName(),
                user.getAvatarUrl(),
                user.isCreator(),
                true,
                creator != null ? creator.getHandle() : null,
                creator != null ? creator.getBio() : null,
                creator != null ? creator.getInstagramUrl() : null,
                creator != null ? creator.getYoutubeUrl() : null,
                creator != null ? creator.getPortfolioUrl() : null,
                followerCount,
                publicWorkCount,
                likedWorkCount,
                user.getCreatedAt());
    }

    private long countPublicWorks(UUID creatorId) {
        List<WorkEntity> works = workRepository.findAllByAuthorId(creatorId);
        return works.stream()
                .filter(work -> work.getStatus() != null && !work.getStatus().isHidden())
                .count();
    }
}
