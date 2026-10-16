package com.manganetworking.service.moderation.dto;

import com.manganetworking.domain.enums.ReportReason;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateReportRequestDto(
        @NotNull(message = "O ID da obra é obrigatório")
        UUID workId,

        UUID chapterId,

        @NotNull(message = "O motivo da denúncia é obrigatório")
        ReportReason reason,

        @NotBlank(message = "A descrição da denúncia não pode ficar em branco")
        @Size(min = 10, max = 1000, message = "A descrição deve ter entre 10 e 1000 caracteres")
        String description
) {}
