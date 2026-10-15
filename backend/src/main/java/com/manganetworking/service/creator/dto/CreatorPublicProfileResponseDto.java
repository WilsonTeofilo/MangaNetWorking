package com.manganetworking.service.creator.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreatorPublicProfileResponseDto(
        UUID id,
        String name,
        String handle,
        String bio,
        String avatarUrl,
        String instagramUrl,
        String youtubeUrl,
        String portfolioUrl,
        BigDecimal membershipPriceBrl,
        boolean isMonetized,
        List<CreatorWorkSummaryDto> works
) {}
