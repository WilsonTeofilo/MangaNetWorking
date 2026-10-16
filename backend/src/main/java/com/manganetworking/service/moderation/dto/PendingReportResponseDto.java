package com.manganetworking.service.moderation.dto;

import java.util.UUID;

public record PendingReportResponseDto(
        UUID id,
        UUID workId,
        String workTitle,
        String workCoverUrl,
        UUID chapterId,
        Integer chapterNumber,
        String reason,
        String description,
        String status,
        String createdAt
) {}
