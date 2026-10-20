package com.manganetworking.service.monetization.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record MembershipCheckoutRequestDto(
        @NotNull UUID creatorId,
        @NotNull @Pattern(regexp = "[0-9a-fA-F-]{36}") String idempotencyKey
) {}
