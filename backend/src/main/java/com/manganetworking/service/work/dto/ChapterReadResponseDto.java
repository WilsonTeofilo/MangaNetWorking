package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.enums.ChapterType;

import java.math.BigDecimal;
import java.util.UUID;

public record ChapterReadResponseDto(
        boolean locked,
        UUID chapterId,
        String workTitle,
        int chapterNumber,
        String chapterTitle,
        String pagesJson,
        long likes,
        boolean likedByMe,
        String authorHandle,
        UUID authorId,
        boolean supportEnabled,
        BigDecimal membershipPriceBrl,
        ChapterFormat format,
        String content,
        /** Blocos versionados de light novel (texto, ilustrações e separadores na ordem de leitura). */
        String blocksJson,
        /** Tipo editorial do capítulo: REGULAR, PROLOGUE (capítulo 0) ou SPECIAL. */
        ChapterType chapterType
) {}
