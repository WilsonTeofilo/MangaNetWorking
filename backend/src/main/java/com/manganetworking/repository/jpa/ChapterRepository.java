package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.ChapterEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChapterRepository extends JpaRepository<ChapterEntity, UUID> {
    List<ChapterEntity> findAllByWorkIdOrderByChapterNumberDesc(UUID workId);
    Optional<ChapterEntity> findByWorkIdAndChapterNumber(UUID workId, Integer chapterNumber);
}
