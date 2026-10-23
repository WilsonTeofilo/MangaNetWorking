package com.manganetworking.service.work.dto;

import java.time.LocalDateTime;

/** Fila de denúncias de comentários para moderadores. */
public record CommentReportResponseDto(
        String id,
        String commentId,
        String workId,
        String commentBody,
        String reporterUsername,
        String reason,
        String details,
        String status,
        LocalDateTime createdAt
) {
}
