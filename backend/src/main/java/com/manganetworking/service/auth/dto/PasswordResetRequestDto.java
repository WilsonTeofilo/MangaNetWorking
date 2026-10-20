package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequestDto(
        @NotBlank(message = "O e-mail é obrigatório")
        @Size(max = 254, message = "O e-mail excede o limite de entrada")
        String email
) {}
