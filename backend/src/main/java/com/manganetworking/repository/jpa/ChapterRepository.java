package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.ChapterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChapterRepository extends JpaRepository<ChapterEntity, UUID> {
    List<ChapterEntity> findAllByWorkIdOrderByChapterNumberDesc(UUID workId);
    Optional<ChapterEntity> findByWorkIdAndChapterNumber(UUID workId, Integer chapterNumber);

    /** Visualização válida (uma por leitor/capítulo/dia) incrementada sem lost update. */
    @Modifying(flushAutomatically = true)
    @Query("update ChapterEntity c set c.views = c.views + 1 where c.id = :id")
    int incrementViews(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update ChapterEntity c set c.likes = c.likes + 1 where c.id = :id")
    int incrementLikes(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update ChapterEntity c set c.likes = case when c.likes > 0 then c.likes - 1 else 0 end where c.id = :id")
    int decrementLikes(@Param("id") UUID id);

    @Query("select c.likes from ChapterEntity c where c.id = :id")
    Long findLikes(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update ChapterEntity c set c.commentsCount = c.commentsCount + 1 where c.id = :id")
    int incrementCommentsCount(@Param("id") UUID id);

    @Modifying(flushAutomatically = true)
    @Query("update ChapterEntity c set c.commentsCount = case when c.commentsCount > 0 then c.commentsCount - 1 else 0 end where c.id = :id")
    int decrementCommentsCount(@Param("id") UUID id);

    /** Capítulos que ficaram públicos recentemente, para o job de notificação. */
    @Query("""
            select c from ChapterEntity c
            where c.publicReleaseAt is not null
              and c.publicReleaseAt <= :now
              and c.publicReleaseAt > :since
            """)
    List<ChapterEntity> findReleasedBetween(
            @Param("now") java.time.LocalDateTime now,
            @Param("since") java.time.LocalDateTime since);
}
