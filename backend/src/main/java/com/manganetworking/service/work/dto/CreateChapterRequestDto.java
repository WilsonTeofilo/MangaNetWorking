package com.manganetworking.service.work.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public record CreateChapterRequestDto(
        @NotNull(message = "O número do capítulo é obrigatório")
        @Min(value = 1, message = "O número do capítulo deve ser maior ou igual a 1")
        Integer chapterNumber,

        @NotBlank(message = "O título do capítulo é obrigatório")
        String title,

        String coverUrl,

        @NotEmpty(message = "O capítulo deve conter ao menos uma página")
        List<String> pages,

        @NotNull(message = "A data de liberação pública é obrigatória")
        LocalDateTime publicReleaseAt
) {}
