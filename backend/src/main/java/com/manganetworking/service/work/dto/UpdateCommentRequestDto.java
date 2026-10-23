package com.manganetworking.service.work.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Edição do próprio comentário. */
public record UpdateCommentRequestDto(
        @NotBlank(message = "O comentário não pode ficar em branco.")
        @Size(max = 1000, message = "O comentário deve ter no máximo 1000 caracteres.")
        String body
) {
}
