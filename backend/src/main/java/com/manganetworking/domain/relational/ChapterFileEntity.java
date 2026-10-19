package com.manganetworking.domain.relational;

import jakarta.persistence.*;

import java.util.UUID;

/**
 * Relação arquivo -> capítulo, usada pelo controle de acesso às páginas de capítulo servidas pelo
 * storage.
 *
 * <p>Substitui a busca por {@code LIKE} em {@code chapters.pages_json}: o {@code filename} é a chave
 * de consulta (índice único {@code uq_chapter_files_filename}), o que torna a verificação do guard
 * uma busca exata e indexada em vez de uma varredura com falso positivo de substring.</p>
 *
 * <p>Mantida como referência por id (sem associação JPA a {@link ChapterEntity}) porque o guard só
 * precisa localizar o capítulo; a associação não é navegada nem serializada.</p>
 */
@Entity
@Table(name = "chapter_files")
public class ChapterFileEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "chapter_id", nullable = false)
    private UUID chapterId;

    @Column(nullable = false, length = 255, unique = true)
    private String filename;

    /** Ordem da página dentro do capítulo (0-based). */
    @Column(nullable = false)
    private Integer position;

    public ChapterFileEntity() {}

    public ChapterFileEntity(UUID chapterId, String filename, Integer position) {
        this.chapterId = chapterId;
        this.filename = filename;
        this.position = position;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public UUID getChapterId() { return chapterId; }
    public void setChapterId(UUID chapterId) { this.chapterId = chapterId; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public Integer getPosition() { return position; }
    public void setPosition(Integer position) { this.position = position; }
}
