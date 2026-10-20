package com.manganetworking.service.monetization.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.UUID;

public record DonationCheckoutRequestDto(
        @NotNull UUID creatorId,
        UUID workId,
        UUID chapterId,
        @NotNull @DecimalMin("2.00") @DecimalMax("10000.00") BigDecimal amountBrl,
        @Size(max = 300) String message,
        @NotNull @Pattern(regexp = "[0-9a-fA-F-]{36}") String idempotencyKey
) {}
