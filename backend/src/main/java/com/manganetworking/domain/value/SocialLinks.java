package com.manganetworking.domain.value;

import com.manganetworking.util.SocialLinkPolicy;

/**
 * Vínculos sociais de um escritor (Instagram, YouTube e portfólio).
 *
 * <p>Os três campos são <strong>opcionais individualmente</strong>: o que é obrigatório é ter
 * <strong>pelo menos um</strong> vínculo — é esse o requisito que separa o perfil público de
 * escritor do perfil de leitor. A validação (allowlist de host, HTTPS obrigatório, sem
 * credencial/porta, HTML removido) fica em {@link SocialLinkPolicy} e é aplicada uma única vez,
 * aqui, para os dois pontos de entrada (cadastro e candidatura a escritor).</p>
 *
 * @param instagramUrl link do Instagram (pode ser nulo)
 * @param youtubeUrl   link do YouTube (pode ser nulo)
 * @param portfolioUrl link de portfólio (pode ser nulo)
 */
public record SocialLinks(String instagramUrl, String youtubeUrl, String portfolioUrl) {

    /** Mensagem única para a falta de vínculo (usada nos dois fluxos). */
    public static final String MISSING_LINK_MESSAGE =
            "Informe pelo menos um link social (Instagram, YouTube ou portfólio) para criar o perfil de escritor.";

    /**
     * Valida os vínculos informados.
     *
     * @param instagram link do Instagram (pode ser vazio)
     * @param youtube   link do YouTube (pode ser vazio)
     * @param portfolio link de portfólio (pode ser vazio)
     * @return os três vínculos validados (nulos quando não informados)
     * @throws IllegalArgumentException quando nenhum vínculo é informado ou algum é inválido
     */
    public static SocialLinks of(String instagram, String youtube, String portfolio) {
        String cleanInstagram = SocialLinkPolicy.sanitizeOptional(instagram);
        String cleanYoutube = SocialLinkPolicy.sanitizeOptional(youtube);
        String cleanPortfolio = SocialLinkPolicy.sanitizeOptional(portfolio);
        if (cleanInstagram == null && cleanYoutube == null && cleanPortfolio == null) {
            throw new IllegalArgumentException(MISSING_LINK_MESSAGE);
        }
        return new SocialLinks(cleanInstagram, cleanYoutube, cleanPortfolio);
    }

    /**
     * Indica se há pelo menos um vínculo informado.
     *
     * @return {@code true} quando existe ao menos um link
     */
    public boolean hasAny() {
        return instagramUrl != null || youtubeUrl != null || portfolioUrl != null;
    }
}
