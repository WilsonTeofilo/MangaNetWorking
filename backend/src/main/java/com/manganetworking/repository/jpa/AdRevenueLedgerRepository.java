package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.AdRevenueLedgerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AdRevenueLedgerRepository extends JpaRepository<AdRevenueLedgerEntity, UUID> {
    List<AdRevenueLedgerEntity> findAllByCreatorIdOrderByCreatedAtDesc(UUID creatorId);
}
