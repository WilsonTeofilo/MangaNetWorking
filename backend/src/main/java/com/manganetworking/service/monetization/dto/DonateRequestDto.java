package com.manganetworking.service.monetization.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public record DonateRequestDto(
        @NotNull(message = "O ID do criador é obrigatório")
        UUID creatorId,

        UUID workId,
        UUID chapterId,

        @NotNull(message = "O valor da doação é obrigatório")
        @DecimalMin(value = "1.00", message = "O valor mínimo de doação é R$ 1,00")
        BigDecimal amountBrl,

        String message,
        String paymentExternalId
) {}
