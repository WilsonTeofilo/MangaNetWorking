package com.manganetworking.service.user.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record UserDataExportDto(
        UUID userId,
        String name,
        String email,
        String avatarUrl,
        boolean isCreator,
        boolean isVip,
        LocalDateTime createdAt,
        List<LikedWorkSummaryDto> likedWorks,
        List<ReadingProgressResponseDto> readingHistory
) {}
