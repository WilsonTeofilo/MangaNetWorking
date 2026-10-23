package com.manganetworking.service.analytics.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Abertura de obra atribuída a uma superfície.
 *
 * <p>A abertura não prova leitura: quem prova é o evento {@code VIEW}, gravado quando a
 * primeira página é efetivamente alcançada. O servidor carimba o horário e verifica se
 * existe uma impressão elegível recente para atribuir a abertura no CTR.</p>
 */
public record TrackOpeningRequestDto(
        @NotBlank(message = "O ID da obra é obrigatório")
        String workId,

        @NotBlank(message = "A superfície é obrigatória")
        String surface,

        @NotBlank(message = "A chave da abertura é obrigatória")
        @Pattern(regexp = "^[A-Za-z0-9:._-]{8,120}$", message = "Chave de abertura inválida")
        String openingKey
) {}
