package com.manganetworking.service.notification.dto;

import java.time.LocalDateTime;

/** Item da central interna de notificações. */
public record NotificationResponseDto(
        String id,
        String type,
        String title,
        String body,
        String targetUrl,
        boolean read,
        LocalDateTime createdAt
) {
}
