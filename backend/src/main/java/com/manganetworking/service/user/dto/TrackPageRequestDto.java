package com.manganetworking.service.user.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record TrackPageRequestDto(
        @NotBlank(message = "O ID da obra é obrigatório")
        String workId,

        @NotBlank(message = "O ID do capítulo é obrigatório")
        String chapterId,

        @Min(value = 1, message = "A página deve ser maior ou igual a 1")
        int page,

        @Min(value = 1, message = "O total de páginas deve ser maior ou igual a 1")
        int totalPages
) {}
