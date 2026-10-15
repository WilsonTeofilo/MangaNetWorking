package com.manganetworking.service.work.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AuthorSummaryDto(
        UUID authorId,
        String authorName,
        String authorHandle,
        String authorAvatarUrl,
        BigDecimal membershipPriceBrl,
        boolean isMonetized
) {}
