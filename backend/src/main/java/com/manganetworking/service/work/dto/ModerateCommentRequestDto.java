package com.manganetworking.service.work.dto;

import jakarta.validation.constraints.NotBlank;

/** Ação de moderação sobre uma denúncia de comentário: DISMISS ou HIDE. */
public record ModerateCommentRequestDto(
        @NotBlank(message = "Informe a ação: DISMISS ou HIDE.")
        String action,

        String notes
) {
}
