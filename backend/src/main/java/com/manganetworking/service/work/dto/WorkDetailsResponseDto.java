package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.WorkFormat;

import java.util.List;
import java.util.UUID;

public record WorkDetailsResponseDto(
        UUID id,
        String title,
        String slug,
        String originalTitle,
        String synopsis,
        String coverUrl,
        String bannerUrl,
        String status,
        WorkFormat format,
        List<Genre> genres,
        int totalChapters,
        long totalViews,
        long totalLikes,
        AuthorSummaryDto author,
        List<ChapterSummaryDto> chapters
) {}
