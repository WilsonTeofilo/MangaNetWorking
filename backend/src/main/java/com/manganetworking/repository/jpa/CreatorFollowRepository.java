package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.CreatorFollowEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CreatorFollowRepository extends JpaRepository<CreatorFollowEntity, CreatorFollowEntity.Key> {

    long countByCreatorId(UUID creatorId);

    boolean existsByFollowerIdAndCreatorId(UUID followerId, UUID creatorId);

    List<CreatorFollowEntity> findAllByCreatorIdOrderByCreatedAtDesc(UUID creatorId);
}
