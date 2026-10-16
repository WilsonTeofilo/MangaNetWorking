package com.manganetworking.service.monetization.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record SubscribeMembershipRequestDto(
        @NotNull(message = "O ID do criador é obrigatório")
        UUID creatorId,

        String paymentExternalId
) {}
