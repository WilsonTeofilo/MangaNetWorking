package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.ChapterFormat;

import java.time.LocalDateTime;
import java.util.UUID;

public record ChapterSummaryDto(
        UUID id,
        int chapterNumber,
        String title,
        String coverUrl,
        LocalDateTime publicReleaseAt,
        boolean isEarlyAccess,
        long views,
        long likes,
        ChapterFormat format
) {}
