package com.manganetworking.service.monetization.dto;

import java.math.BigDecimal;

public record CheckoutResponseDto(String checkoutUrl, BigDecimal amountBrl) {}
