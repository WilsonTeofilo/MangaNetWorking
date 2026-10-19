package com.manganetworking.service.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequestDto(
        @NotBlank(message = "O nome é obrigatório")
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
        String name,

        @NotBlank(message = "O e-mail é obrigatório")
        @Email(message = "Formato de e-mail inválido")
        String email,

        @NotBlank(message = "A senha é obrigatória")
        @Size(min = 8, max = 100, message = "A senha deve ter no mínimo 8 caracteres")
        String password,

        boolean isCreator,

        @Size(max = 50, message = "O handle deve ter no máximo 50 caracteres")
        String handle,

        String cpf,

        Boolean isProfilePublic,

        // Consentimento LGPD (Art. 7º, I e Art. 8º)
        Boolean termsAccepted,

        // Data de nascimento para proteção e controle de maioridade (Art. 14)
        java.time.LocalDate birthDate
) {
    /** Construtor de conveniência para retrocompatibilidade com testes legados */
    public RegisterRequestDto(String name, String email, String password, boolean isCreator, String handle, String cpf, Boolean isProfilePublic) {
        this(name, email, password, isCreator, handle, cpf, isProfilePublic, true, java.time.LocalDate.of(2000, 1, 1));
    }
}
