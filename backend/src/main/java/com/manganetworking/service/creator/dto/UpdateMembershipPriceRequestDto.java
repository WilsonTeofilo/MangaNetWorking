package com.manganetworking.service.creator.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record UpdateMembershipPriceRequestDto(
        @NotNull(message = "O preço é obrigatório")
        @DecimalMin(value = "7.99", message = "O preço mínimo de assinatura é R$ 7,99")
        @DecimalMax(value = "45.99", message = "O preço máximo de assinatura é R$ 45,99")
        BigDecimal priceBrl
) {}
