package com.manganetworking.service.work.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Denúncia de comentário. A decisão de ocultar é sempre da moderação. */
public record ReportCommentRequestDto(
        @NotBlank(message = "Informe o motivo da denúncia.")
        @Size(max = 40, message = "O motivo deve ter no máximo 40 caracteres.")
        String reason,

        @Size(max = 500, message = "Os detalhes devem ter no máximo 500 caracteres.")
        String details
) {
}
