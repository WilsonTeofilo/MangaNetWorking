package com.manganetworking.service.monetization.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record SubscribeMembershipResponseDto(
        String status,
        UUID subscriptionId,
        BigDecimal monthlyPriceBrl,
        LocalDateTime expiresAt,
        String message
) {}
