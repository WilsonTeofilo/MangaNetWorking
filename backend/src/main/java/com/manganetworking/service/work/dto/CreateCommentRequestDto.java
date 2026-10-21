package com.manganetworking.service.work.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Comentário enviado na obra.
 *
 * <p>O corpo é texto puro: o servidor higieniza (sem tag HTML, sem {@code javascript:}) e
 * o front renderiza como texto — nunca como HTML.</p>
 */
public record CreateCommentRequestDto(
        java.util.UUID chapterId,

        @NotBlank(message = "O comentário não pode ficar em branco.")
        @Size(max = MAX_LENGTH, message = "O comentário deve ter no máximo 1000 caracteres.")
        String body
) {
    /** Limite canônico do corpo do comentário (mesmo valor exigido pelo serviço). */
    public static final int MAX_LENGTH = 1000;
}
