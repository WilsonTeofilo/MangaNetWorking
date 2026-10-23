package com.manganetworking.service.notification.dto;

import java.util.List;

/** Página da central interna, com o total de não lidas para o sino. */
public record NotificationPageResponseDto(
        List<NotificationResponseDto> items,
        int page,
        int size,
        long total,
        boolean hasMore,
        long unreadCount
) {
}
