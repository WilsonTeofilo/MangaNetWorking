package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LoginRequestDto(
        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        String email,

        @NotNull(message = "A senha é obrigatória")
        @Size(max = 128, message = "A senha excede o limite de entrada")
        String password
) {}
