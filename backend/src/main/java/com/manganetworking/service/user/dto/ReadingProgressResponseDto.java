package com.manganetworking.service.user.dto;

import com.manganetworking.domain.nosql.ReadingProgressDocument;

import java.time.Instant;

/**
 * DTO de apresentação do histórico de leitura.
 *
 * <p>Mantém os mesmos nomes de campo do {@link ReadingProgressDocument} (contrato JSON preservado no
 * histórico e na exportação LGPD), desacoplando a API do modelo de persistência do MongoDB.</p>
 */
public record ReadingProgressResponseDto(
        String id,
        String userId,
        String workId,
        String workTitle,
        String workCoverUrl,
        String workSlug,
        String workFormat,
        String chapterId,
        Integer chapterNumber,
        String chapterTitle,
        Integer page,
        Integer totalPages,
        Integer cumulativePagesRead,
        Instant updatedAt
) {

    public static ReadingProgressResponseDto from(ReadingProgressDocument doc) {
        return new ReadingProgressResponseDto(
                doc.getId(),
                doc.getUserId(),
                doc.getWorkId(),
                doc.getWorkTitle(),
                doc.getWorkCoverUrl(),
                doc.getWorkSlug(),
                doc.getWorkFormat(),
                doc.getChapterId(),
                doc.getChapterNumber(),
                doc.getChapterTitle(),
                doc.getPage(),
                doc.getTotalPages(),
                doc.getCumulativePagesRead(),
                doc.getUpdatedAt()
        );
    }
}
