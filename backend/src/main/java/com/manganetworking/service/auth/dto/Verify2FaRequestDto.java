package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record Verify2FaRequestDto(
        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        String email,

        @NotBlank(message = "O código 2FA é obrigatório")
        @Pattern(regexp = "^\\d{6}$", message = "O código 2FA deve conter exatamente 6 dígitos numéricos")
        String code
) {}
