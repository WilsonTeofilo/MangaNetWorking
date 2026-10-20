package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordResetConfirmDto(
        @NotBlank @Size(max = 128) String token,
        @NotNull @Size(max = 256) String newPassword
) {}
