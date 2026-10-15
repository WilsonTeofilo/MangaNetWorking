package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.FinancialLedgerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FinancialLedgerRepository extends JpaRepository<FinancialLedgerEntity, UUID> {
    Optional<FinancialLedgerEntity> findByPaymentExternalId(String paymentExternalId);
    List<FinancialLedgerEntity> findAllByCreatorIdOrderByCreatedAtDesc(UUID creatorId);
}
