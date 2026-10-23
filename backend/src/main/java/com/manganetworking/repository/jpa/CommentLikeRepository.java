package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.CommentLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLikeEntity, UUID> {

    boolean existsByUser_IdAndComment_Id(UUID userId, UUID commentId);

    @Modifying
    @Query(value = """
            INSERT INTO comment_likes (id, user_id, comment_id, created_at)
            VALUES (:id, :userId, :commentId, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, comment_id) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("commentId") UUID commentId);

    long deleteByUser_IdAndComment_Id(UUID userId, UUID commentId);

    @Query("""
            select l.comment.id from CommentLikeEntity l
            where l.user.id = :userId and l.comment.id in :commentIds
            """)
    Set<UUID> findLikedCommentIds(
            @Param("userId") UUID userId,
            @Param("commentIds") Collection<UUID> commentIds);
}
