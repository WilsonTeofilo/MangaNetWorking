package com.manganetworking.service.user.dto;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record UserDataExportDto(
        UUID userId,
        String name,
        String email,
        String avatarUrl,
        boolean isCreator,
        boolean isVip,
        LocalDateTime createdAt,
        LocalDate birthDate,
        boolean isProfilePublic,
        LocalDateTime termsAcceptedAt,
        String privacyPolicyVersion,
        List<LikedWorkSummaryDto> likedWorks,
        List<ReadingProgressResponseDto> readingHistory,
        List<Map<String, Object>> privacyConsentHistory,
        List<Map<String, Object>> financialHistory
) {}
