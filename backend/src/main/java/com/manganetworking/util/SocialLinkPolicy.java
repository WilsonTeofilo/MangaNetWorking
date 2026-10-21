package com.manganetworking.util;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;

/**
 * Validação dos vínculos sociais do perfil de escritor.
 *
 * <p>É uma allowlist de host, com HTTPS obrigatório. Isso fecha o desenho classicsó de
 * link malicioso: {@code javascript:}, {@code data:}, {@code http:} para página de perfil,
 * URL com credencial embutida ({@code https://user@instagram.com}) ou apontando para um
 * domínio desconhecido que sequestra a confiança do leitor ("phishing de perfil").</p>
 *
 * <p>O valor também é higienizado (sem HTML) e o front deve renderizá-lo como texto,
 * nunca como {@code innerHTML}.</p>
 */
public final class SocialLinkPolicy {

    /** Hosts aceitos para o vínculo social do escritor. */
    private static final Set<String> ALLOWED_HOSTS = Set.of(
            "instagram.com", "www.instagram.com",
            "youtube.com", "www.youtube.com", "youtu.be",
            "tiktok.com", "www.tiktok.com",
            "x.com", "www.x.com", "twitter.com", "www.twitter.com",
            "behance.net", "www.behance.net",
            "artstation.com", "www.artstation.com",
            "deviantart.com", "www.deviantart.com",
            "medium.com", "www.medium.com",
            "linktr.ee", "www.linktr.ee",
            "spotify.com", "www.spotify.com",
            "soundcloud.com", "www.soundcloud.com",
            "substack.com", "www.substack.com"
    );

    /** Limite maximo do link (mesmo valor aceito pelos DTOs de perfil). */
    public static final int MAX_LENGTH = 255;

    private SocialLinkPolicy() {
    }

    /**
     * Higieniza e valida um vínculo social.
     *
     * @param raw link informado pelo usuário
     * @return o link validado (sem espaços nas bordas)
     * @throws IllegalArgumentException quando o link é inválido ou o host não é permitido
     */
    public static String sanitize(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("Informe um link social válido.");
        }
        String candidate = SanitizationUtils.stripAllHtml(raw.trim());
        if (candidate.isBlank()) {
            throw new IllegalArgumentException("Informe um link social válido.");
        }
        if (candidate.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("O link social excede o limite de 255 caracteres.");
        }
        if (candidate.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("O link social contém caracteres inválidos.");
        }

        URI uri;
        try {
            uri = new URI(candidate);
        } catch (URISyntaxException invalid) {
            throw new IllegalArgumentException("O link social está malformado.");
        }

        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!"https".equals(scheme)) {
            throw new IllegalArgumentException("O link social precisa começar com https://.");
        }
        if (uri.getUserInfo() != null) {
            throw new IllegalArgumentException("O link social não pode conter credenciais.");
        }
        if (uri.getPort() != -1) {
            throw new IllegalArgumentException("O link social não pode usar porta específica.");
        }
        String host = uri.getHost();
        if (host == null || !ALLOWED_HOSTS.contains(host.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Plataforma de rede social não suportada: use Instagram, YouTube ou outra lista válida.");
        }
        return candidate;
    }

    /**
     * Higieniza um vínculo que pode vir vazio (perfil sem aquele link).
     *
     * @param raw link informado pelo usuário
     * @return o link validado ou {@code null} quando não informado
     */
    public static String sanitizeOptional(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return sanitize(raw);
    }
}
