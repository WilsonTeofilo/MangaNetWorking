package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.ChapterFormat;

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
        String content
) {}
