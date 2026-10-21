package com.manganetworking.service.creator.dto;

import jakarta.validation.constraints.Size;

/**
 * Candidatura de leitor a escritor.
 *
 * <p>Exige <strong>pelo menos um vínculo social</strong> (Instagram, YouTube ou portfólio):
 * é o que separa o perfil público de escritor do perfil de leitor e dá um ponto de contato
 * real para a plataforma e para os leitores.</p>
 */
public record ApplyAsCreatorRequestDto(
        @Size(max = 50, message = "O handle deve ter no máximo 50 caracteres")
        String handle,

        @Size(max = 255, message = "O link do Instagram excede o limite de entrada")
        String instagramUrl,

        @Size(max = 255, message = "O link do YouTube excede o limite de entrada")
        String youtubeUrl,

        @Size(max = 255, message = "O link de portfólio excede o limite de entrada")
        String portfolioUrl,

        @Size(max = 20, message = "O CPF excede o limite de entrada")
        String cpf
) {
}
