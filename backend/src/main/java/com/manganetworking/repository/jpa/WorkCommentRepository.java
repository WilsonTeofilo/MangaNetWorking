package com.manganetworking.repository.jpa;

import com.manganetworking.domain.enums.CommentStatus;
import com.manganetworking.domain.relational.WorkCommentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkCommentRepository extends JpaRepository<WorkCommentEntity, UUID> {

    Optional<WorkCommentEntity> findByIdAndWorkId(UUID id, UUID workId);

    /**
     * Ranking de comentários: curtida pesa 2, resposta visível pesa 0,5 e a
     * recência entra como apoio (0,1 por dia de idade, no máximo). O desempate
     * é determinístico por data e id, para a paginação não oscilar.
     */
    @Query(value = """
            SELECT c.* FROM work_comments c
            WHERE c.work_id = :workId
              AND c.parent_id IS NULL
              AND c.status IN ('VISIBLE', 'DELETED')
              AND (:chapterId IS NULL OR c.chapter_id = :chapterId)
            ORDER BY (
                c.likes_count * 2.0
                + COALESCE((
                    SELECT COUNT(*) FROM work_comments r
                    WHERE r.parent_id = c.id AND r.status = 'VISIBLE'
                ), 0) * 0.5
                - EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at)) / 86400.0 * 0.1
            ) DESC, c.created_at DESC, c.id
            """,
            countQuery = """
            SELECT COUNT(*) FROM work_comments c
            WHERE c.work_id = :workId
              AND c.parent_id IS NULL
              AND c.status IN ('VISIBLE', 'DELETED')
              AND (:chapterId IS NULL OR c.chapter_id = :chapterId)
            """,
            nativeQuery = true)
    Page<WorkCommentEntity> findTopLevelByScore(
            @Param("workId") UUID workId,
            @Param("chapterId") UUID chapterId,
            Pageable pageable);

    @Query(value = """
            SELECT c.* FROM work_comments c
            WHERE c.work_id = :workId
              AND c.parent_id IS NULL
              AND c.status IN ('VISIBLE', 'DELETED')
              AND (:chapterId IS NULL OR c.chapter_id = :chapterId)
            ORDER BY c.created_at DESC, c.id DESC
            """,
            countQuery = """
            SELECT COUNT(*) FROM work_comments c
            WHERE c.work_id = :workId
              AND c.parent_id IS NULL
              AND c.status IN ('VISIBLE', 'DELETED')
              AND (:chapterId IS NULL OR c.chapter_id = :chapterId)
            """,
            nativeQuery = true)
    Page<WorkCommentEntity> findTopLevelNewest(
            @Param("workId") UUID workId,
            @Param("chapterId") UUID chapterId,
            Pageable pageable);

    List<WorkCommentEntity> findByParentIdAndStatusInOrderByCreatedAtAscIdAsc(
            UUID parentId, Collection<CommentStatus> statuses);

    List<WorkCommentEntity> findByParentIdInAndStatusInOrderByParentIdAscCreatedAtAscIdAsc(
            Collection<UUID> parentIds, Collection<CommentStatus> statuses);

    long countByParentIdAndStatus(UUID parentId, CommentStatus status);

    long countByWorkIdAndParentIsNullAndStatusIn(UUID workId, Collection<CommentStatus> statuses);

    long countByWorkIdAndChapterIdAndParentIsNullAndStatusIn(
            UUID workId, UUID chapterId, Collection<CommentStatus> statuses);

    long countByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime after);

    @Query("""
            select r.parent.id, count(r)
            from WorkCommentEntity r
            where r.parent.id in :parentIds and r.status = com.manganetworking.domain.enums.CommentStatus.VISIBLE
            group by r.parent.id
            """)
    List<Object[]> countVisibleRepliesByParentIds(@Param("parentIds") Collection<UUID> parentIds);

    @Query("select c.likesCount from WorkCommentEntity c where c.id = :id")
    Long findLikesCount(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update WorkCommentEntity c set c.likesCount = c.likesCount + 1 where c.id = :id")
    int incrementLikes(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("""
            update WorkCommentEntity c
            set c.likesCount = case when c.likesCount > 0 then c.likesCount - 1 else 0 end
            where c.id = :id
            """)
    int decrementLikes(@Param("id") UUID id);
}
