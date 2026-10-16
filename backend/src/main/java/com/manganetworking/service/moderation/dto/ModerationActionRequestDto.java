package com.manganetworking.service.moderation.dto;

import jakarta.validation.constraints.Size;

public record ModerationActionRequestDto(
        @Size(max = 1000, message = "As notas de moderação devem ter no máximo 1000 caracteres")
        String reason,

        @Size(max = 1000, message = "As notas de moderação devem ter no máximo 1000 caracteres")
        String notes
) {}
