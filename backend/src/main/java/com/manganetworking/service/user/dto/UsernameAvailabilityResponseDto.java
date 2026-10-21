package com.manganetworking.service.user.dto;

/**
 * Disponibilidade de um username.
 *
 * @param available     {@code true} quando o username pode ser usado
 * @param suggestion    alternativa livre quando o desejado já existe (pode ser nula)
 * @param invalidReason motivo da recusa por formato inválido (pode ser nulo)
 */
public record UsernameAvailabilityResponseDto(
        boolean available,
        String suggestion,
        String invalidReason
) {
}
