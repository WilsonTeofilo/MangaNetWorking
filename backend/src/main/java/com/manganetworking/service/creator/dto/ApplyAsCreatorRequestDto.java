package com.manganetworking.service.creator.dto;

import jakarta.validation.constraints.Size;

/**
 * Candidatura de leitor a escritor.
 *
 * <p>Exige <strong>pelo menos um vínculo social</strong> (Instagram, YouTube ou portfólio):
 * é o que separa o perfil público de escritor do perfil de leitor e dá um ponto de contato
 * real para a plataforma e para os leitores. Os três campos são <strong>opcionais</strong>
 * individualmente — basta um deles.</p>
 *
 * <p>O identificador público do autor <strong>não</strong> é escolhido aqui: é o próprio
 * username da conta de leitor, reciclado. Não existe segundo identificador para o usuário
 * decorar (e nem risco de duplicidade).</p>
 */
public record ApplyAsCreatorRequestDto(
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
