package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.Genre;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateWorkRequestDto(
        @NotBlank(message = "O título da obra é obrigatório")
        @Size(max = 150, message = "O título deve ter no máximo 150 caracteres")
        String title,

        @Size(max = 150, message = "O título alternativo deve ter no máximo 150 caracteres")
        String originalTitle,

        @NotBlank(message = "A sinopse é obrigatória")
        String synopsis,

        @NotBlank(message = "A imagem de capa da obra é obrigatória")
        String coverUrl,

        String bannerUrl,

        @NotEmpty(message = "Selecione ao menos um gênero para a obra")
        List<Genre> genres,

        @AssertTrue(message = "É obrigatório declarar que você é o autor original dos direitos da obra (Tolerância Zero para Pirataria).")
        boolean originalAuthorDeclaration
) {}
