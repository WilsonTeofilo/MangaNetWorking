package com.manganetworking.service.analytics.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Lote de impressões de cards de obra realmente visíveis.
 *
 * <p>O cliente só envia {@code workId}, a categoria fechada de {@code surface} e uma
 * {@code impressionKey} pseudônima. Não há URL, texto, IP, e-mail ou timestamp do
 * cliente: o horário canônico é carimbado no servidor.</p>
 */
public record TrackImpressionRequestDto(
        @NotEmpty(message = "Envie ao menos uma impressão")
        @Size(max = 20, message = "O lote de impressões aceita no máximo 20 itens")
        List<@Valid ImpressionDto> impressions
) {
    public record ImpressionDto(
            @NotBlank(message = "O ID da obra é obrigatório")
            String workId,

            @NotBlank(message = "A superfície é obrigatória")
            String surface,

            @NotBlank(message = "A chave da impressão é obrigatória")
            @Pattern(regexp = "^[A-Za-z0-9:._-]{8,120}$", message = "Chave de impressão inválida")
            String impressionKey
    ) {}
}
