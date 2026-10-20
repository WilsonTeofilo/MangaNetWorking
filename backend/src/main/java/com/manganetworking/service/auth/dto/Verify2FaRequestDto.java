package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record Verify2FaRequestDto(
        @NotBlank(message = "O e-mail é obrigatório")
        @Size(max = 254, message = "O e-mail excede o limite de entrada")
        String email,

        @NotBlank(message = "O código 2FA é obrigatório")
        @Pattern(regexp = "^\\d{6}$", message = "O código 2FA deve conter exatamente 6 dígitos numéricos")
        String code
) {}
