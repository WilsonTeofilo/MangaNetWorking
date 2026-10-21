package com.manganetworking.service.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Confirmação do código de 2FA.
 *
 * <p>O identificador aceita e-mail ou username — o servidor resolve a conta e compara o
 * código com o desafio emitido para o e-mail real do titular.</p>
 */
public record Verify2FaRequestDto(
        @JsonAlias({"email", "user", "login"})
        @NotBlank(message = "Informe o e-mail ou o username.")
        @Size(max = 254, message = "O identificador excede o limite de entrada")
        String identifier,

        @NotBlank(message = "O código 2FA é obrigatório")
        @Pattern(regexp = "^\\d{6}$", message = "O código 2FA deve conter exatamente 6 dígitos numéricos")
        String code
) {
}
