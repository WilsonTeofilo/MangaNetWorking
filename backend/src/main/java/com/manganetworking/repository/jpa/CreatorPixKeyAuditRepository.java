package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.CreatorPixKeyAuditEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CreatorPixKeyAuditRepository extends JpaRepository<CreatorPixKeyAuditEntity, UUID> {
}
