package com.manganetworking.service.catalog.dto;

import com.manganetworking.domain.enums.ChapterType;
import com.manganetworking.domain.enums.WorkFormat;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lançamento (capítulo já público) com o formato da obra.
 *
 * <p>O agrupamento por dia é feito no cliente porque depende do fuso do leitor; o servidor
 * entrega instantes ordenados e só capítulos cuja data de publicação já passou.</p>
 */
public record CatalogReleaseResponseDto(
        UUID workId,
        String workSlug,
        String workTitle,
        String coverUrl,
        WorkFormat format,
        UUID chapterId,
        int chapterNumber,
        String chapterTitle,
        ChapterType chapterType,
        LocalDateTime publishedAt,
        int totalChapters,
        long totalViews,
        long totalFavorites
) {}
