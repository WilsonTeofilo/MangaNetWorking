package com.manganetworking.repository.jpa;

import com.manganetworking.domain.enums.CommentReportStatus;
import com.manganetworking.domain.relational.CommentReportEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CommentReportRepository extends JpaRepository<CommentReportEntity, UUID> {

    boolean existsByComment_IdAndReporter_Id(UUID commentId, UUID reporterId);

    @EntityGraph(attributePaths = {"comment", "comment.user", "reporter"})
    List<CommentReportEntity> findAllByStatusOrderByCreatedAtAsc(CommentReportStatus status, Pageable pageable);
}
