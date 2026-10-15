package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.DonationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DonationRepository extends JpaRepository<DonationEntity, UUID> {
    List<DonationEntity> findAllByCreatorIdOrderByCreatedAtDesc(UUID creatorId);
}
