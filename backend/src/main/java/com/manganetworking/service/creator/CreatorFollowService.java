package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.CreatorFollowEntity;
import com.manganetworking.repository.jpa.CreatorFollowRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Seguidores do escritor.
 *
 * <p>Regra do produto: <strong>só escritores têm seguidores</strong>. Leitor não tem página
 * de seguidores nem pode ser seguido — a ação só existe para quem tem perfil de escritor.
 * Um escritor pode seguir outro escritor; ninguém segue a si mesmo.</p>
 */
@Service
public class CreatorFollowService {

    private final CreatorRepository creatorRepository;
    private final CreatorFollowRepository followRepository;

    public CreatorFollowService(CreatorRepository creatorRepository, CreatorFollowRepository followRepository) {
        this.creatorRepository = creatorRepository;
        this.followRepository = followRepository;
    }

    @Transactional
    public long follow(UUID followerId, String rawHandle) {
        CreatorEntity creator = resolveCreator(rawHandle);
        if (creator.getUser() != null && creator.getUser().getId().equals(followerId)) {
            throw new IllegalArgumentException("Você não pode seguir a si mesmo.");
        }
        if (!followRepository.existsByFollowerIdAndCreatorId(followerId, creator.getId())) {
            followRepository.save(new CreatorFollowEntity(followerId, creator.getId()));
        }
        return followRepository.countByCreatorId(creator.getId());
    }

    @Transactional
    public long unfollow(UUID followerId, String rawHandle) {
        CreatorEntity creator = resolveCreator(rawHandle);
        followRepository.deleteById(new CreatorFollowEntity.Key(followerId, creator.getId()));
        return followRepository.countByCreatorId(creator.getId());
    }

    @Transactional(readOnly = true)
    public long countFollowers(String rawHandle) {
        return followRepository.countByCreatorId(resolveCreator(rawHandle).getId());
    }

    private CreatorEntity resolveCreator(String rawHandle) {
        String handle = rawHandle == null ? "" : rawHandle.trim().replace("@", "");
        return creatorRepository.findByHandle(handle)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado: @" + handle));
    }
}
