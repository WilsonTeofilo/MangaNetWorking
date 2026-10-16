package com.manganetworking.repository.jpa;

import com.manganetworking.domain.relational.ChapterFileEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChapterFileRepository extends JpaRepository<ChapterFileEntity, UUID> {

    /**
     * Busca exata pelo nome do arquivo, servida pelo índice único {@code uq_chapter_files_filename}.
     * É o valor recebido em {@code GET /api/storage/{filename}}, logo não há token/LIKE envolvido.
     */
    Optional<ChapterFileEntity> findByFilename(String filename);
}
