package com.manganetworking.service.email.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;

/**
 * Evento de entrega de e-mail informado pelo provedor (bounce/complaint).
 *
 * @param email      endereço afetado
 * @param eventType  {@code bounce} ou {@code complaint}
 * @param reason     motivo informado pelo provedor
 * @param provider   provedor de e-mail
 * @param occurredAt instante do evento
 */
public record EmailDeliveryEventDto(
        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        String email,

        @NotBlank(message = "O tipo do evento é obrigatório")
        @Pattern(regexp = "(?i)bounce|complaint|delivery", message = "Tipo de evento inválido")
        String eventType,

        String reason,

        String provider,

        Instant occurredAt
) {
}
