package com.manganetworking.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Credenciais de login.
 *
 * <p>O identificador aceita <strong>e-mail ou username</strong> (segunda via de acesso).
 * O campo antigo {@code email} continua aceito para não quebrar clientes já em uso.</p>
 */
public record LoginRequestDto(
        @JsonAlias({"email", "user", "login"})
        @NotBlank(message = "Informe o e-mail ou o username.")
        @Size(max = 254, message = "O identificador excede o limite de entrada")
        String identifier,

        @NotNull(message = "A senha é obrigatória")
        @Size(max = 128, message = "A senha excede o limite de entrada")
        String password
) {
}
