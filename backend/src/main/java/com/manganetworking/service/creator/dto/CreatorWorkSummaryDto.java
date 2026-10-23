package com.manganetworking.service.creator.dto;

import java.util.UUID;

public record CreatorWorkSummaryDto(
        UUID id,
        String title,
        String slug,
        String synopsis,
        String coverUrl,
        int totalChapters,
        long totalViews,
        long totalLikes,
        long totalFavorites
) {}
