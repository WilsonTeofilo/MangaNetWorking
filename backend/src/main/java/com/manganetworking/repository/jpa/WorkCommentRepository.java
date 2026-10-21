package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.WorkCommentEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WorkCommentRepository extends JpaRepository<WorkCommentEntity, UUID> {

    List<WorkCommentEntity> findAllByWorkIdOrderByCreatedAtDesc(UUID workId, Pageable pageable);

    long countByWorkId(UUID workId);
}
