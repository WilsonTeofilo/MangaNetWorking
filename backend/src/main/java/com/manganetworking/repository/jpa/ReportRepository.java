package com.manganetworking.repository.jpa;

import com.manganetworking.domain.enums.ReportStatus;
import com.manganetworking.domain.relational.ReportEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<ReportEntity, UUID> {
    List<ReportEntity> findAllByStatusOrderByCreatedAtDesc(ReportStatus status);
    List<ReportEntity> findAllByWorkIdOrderByCreatedAtDesc(UUID workId);
}
