package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.ChapterLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChapterLikeRepository extends JpaRepository<ChapterLikeEntity, UUID> {
    Optional<ChapterLikeEntity> findByUser_IdAndChapter_Id(UUID userId, UUID chapterId);

    boolean existsByUser_IdAndChapter_Id(UUID userId, UUID chapterId);

    /** Inserção idempotente: clique repetido ou corrida não duplica a curtida. */
    @Modifying
    @Query(value = """
            insert into chapter_likes (id, user_id, chapter_id, created_at)
            values (:id, :userId, :chapterId, current_timestamp)
            on conflict (user_id, chapter_id) do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("id") UUID id, @Param("userId") UUID userId, @Param("chapterId") UUID chapterId);

    @Modifying
    @Query(value = "delete from chapter_likes where user_id = :userId and chapter_id = :chapterId", nativeQuery = true)
    int deleteByUserAndChapter(@Param("userId") UUID userId, @Param("chapterId") UUID chapterId);
}
