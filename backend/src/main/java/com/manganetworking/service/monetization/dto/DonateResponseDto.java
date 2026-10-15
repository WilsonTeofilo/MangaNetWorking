package com.manganetworking.service.monetization.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record DonateResponseDto(
        String status,
        UUID donationId,
        BigDecimal grossAmountBrl,
        BigDecimal platformFeeBrl,
        BigDecimal creatorNetBrl,
        String message
) {}
