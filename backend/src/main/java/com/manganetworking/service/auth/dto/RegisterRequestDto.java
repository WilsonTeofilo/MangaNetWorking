package com.manganetworking.service.auth.dto;

import com.manganetworking.domain.enums.Sex;
import com.manganetworking.util.UsernamePolicy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Cadastro de conta.
 *
 * <p>Obrigatórios: nome, username (identificador único e imutável), e-mail, senha,
 * data de nascimento e política de privacidade aceita. O sexo é opcional por natureza
 * (o titular pode deixar "não informado").</p>
 *
 * <p>Quem quer publicar como escritor precisa declarar <strong>pelo menos um vínculo
 * social</strong> (Instagram, YouTube ou portfólio): é o que separa o perfil público de
 * escritor do perfil de leitor e o que dá um ponto de contato real à plataforma.</p>
 */
public record RegisterRequestDto(
        @NotBlank(message = "O nome é obrigatório")
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
        String name,

        @NotBlank(message = "O username é obrigatório")
        @Size(min = UsernamePolicy.MIN_LENGTH, max = UsernamePolicy.MAX_LENGTH, message = "O username deve ter entre 3 e 30 caracteres")
        String username,

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

        Sex sex,

        @Size(max = 255, message = "O link do Instagram excede o limite de entrada")
        String instagramUrl,

        @Size(max = 255, message = "O link do YouTube excede o limite de entrada")
        String youtubeUrl,

        @Size(max = 255, message = "O link de portfólio excede o limite de entrada")
        String portfolioUrl,

        // Consentimento LGPD (Art. 7º, I e Art. 8º)
        Boolean termsAccepted,

        @jakarta.validation.constraints.NotBlank(message = "A versão da política aceita é obrigatória")
        String privacyPolicyVersion,

        // Data de nascimento para proteção e controle de maioridade (Art. 14)
        java.time.LocalDate birthDate
) {
}
