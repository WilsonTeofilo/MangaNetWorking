package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequestDto(
        @NotBlank(message = "O token do Google é obrigatório")
        String googleToken,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        String email,

        String name,
        String avatarUrl
) {}
