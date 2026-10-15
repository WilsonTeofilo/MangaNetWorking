package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.CreatorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreatorRepository extends JpaRepository<CreatorEntity, UUID> {
    Optional<CreatorEntity> findByHandle(String handle);
    Optional<CreatorEntity> findByUserId(UUID userId);
}
