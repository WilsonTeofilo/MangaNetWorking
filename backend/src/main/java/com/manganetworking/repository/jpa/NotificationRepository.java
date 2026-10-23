package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.NotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<NotificationEntity, UUID> {

    Page<NotificationEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    long countByUserIdAndReadAtIsNull(UUID userId);

    @Modifying
    @Query(value = """
            INSERT INTO notifications (id, user_id, type, title, body, target_url, dedup_key, created_at)
            VALUES (:id, :userId, :type, :title, :body, :targetUrl, :dedupKey, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, dedup_key) DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(
            @Param("id") UUID id,
            @Param("userId") UUID userId,
            @Param("type") String type,
            @Param("title") String title,
            @Param("body") String body,
            @Param("targetUrl") String targetUrl,
            @Param("dedupKey") String dedupKey);

    @Modifying
    @Query("""
            update NotificationEntity n set n.readAt = :readAt
            where n.id = :id and n.user.id = :userId and n.readAt is null
            """)
    int markRead(@Param("id") UUID id, @Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    @Modifying
    @Query("""
            update NotificationEntity n set n.readAt = :readAt
            where n.user.id = :userId and n.readAt is null
            """)
    int markAllRead(@Param("userId") UUID userId, @Param("readAt") LocalDateTime readAt);

    long deleteByUserIdAndReadAtIsNotNull(UUID userId);
}
