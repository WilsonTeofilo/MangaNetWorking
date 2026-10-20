package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequestDto(
        @NotBlank(message = "O token do Google é obrigatório")
        String googleToken,
        Boolean termsAccepted,
        String privacyPolicyVersion
) {
    public GoogleLoginRequestDto(String googleToken) {
        this(googleToken, null, null);
    }
}
