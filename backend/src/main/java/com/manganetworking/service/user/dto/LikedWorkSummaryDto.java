package com.manganetworking.service.user.dto;

import java.util.UUID;

public record LikedWorkSummaryDto(
        UUID id,
        String title,
        String slug,
        String coverUrl,
        String authorName
) {}
