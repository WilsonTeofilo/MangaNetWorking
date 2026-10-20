package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.CreatorEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CreatorRepository extends JpaRepository<CreatorEntity, UUID> {
    Optional<CreatorEntity> findByHandle(String handle);
    Optional<CreatorEntity> findByUserId(UUID userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select creator from CreatorEntity creator where creator.id = :id")
    Optional<CreatorEntity> findByIdForUpdate(@Param("id") UUID id);
}
