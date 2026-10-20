package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
        @NotBlank(message = "O nome é obrigatório")
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
        String name,

        @NotBlank(message = "O e-mail é obrigatório")
        @Size(max = 254, message = "O e-mail excede o limite de entrada")
        String email,

        @NotNull(message = "A senha é obrigatória")
        @Size(max = 128, message = "A senha excede o limite de entrada")
        String password,

        boolean isCreator,

        @Size(max = 50, message = "O handle deve ter no máximo 50 caracteres")
        String handle,

        String cpf,

        Boolean isProfilePublic,

        // Consentimento LGPD (Art. 7º, I e Art. 8º)
        Boolean termsAccepted,

        @jakarta.validation.constraints.NotBlank(message = "A versão da política aceita é obrigatória")
        String privacyPolicyVersion,

        // Data de nascimento para proteção e controle de maioridade (Art. 14)
        java.time.LocalDate birthDate
        ) {}
