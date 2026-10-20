package com.manganetworking.service.creator;

import java.net.URI;
import java.util.Locale;
import java.util.Set;

/** Validates public profile links before they become visible to readers. */
final class CreatorProfileUrlPolicy {

    private static final Set<String> INSTAGRAM_HOSTS = Set.of("instagram.com", "www.instagram.com");
    private static final Set<String> YOUTUBE_HOSTS = Set.of(
            "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be");

    private CreatorProfileUrlPolicy() {}

    static String instagram(String value) {
        return validateSocialUrl(value, INSTAGRAM_HOSTS, "Instagram");
    }

    static String youtube(String value) {
        return validateSocialUrl(value, YOUTUBE_HOSTS, "YouTube");
    }

    static String portfolio(String value) {
        return validateHttpsUrl(value, "Portfólio");
    }

    private static String validateSocialUrl(String value, Set<String> allowedHosts, String label) {
        String normalized = validateHttpsUrl(value, label);
        if (normalized == null) return null;

        URI uri = URI.create(normalized);
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (!allowedHosts.contains(host) || uri.getPath().isBlank() || uri.getPath().equals("/")) {
            throw new IllegalArgumentException("Informe um link de perfil válido do " + label + ".");
        }
        return normalized;
    }

    private static String validateHttpsUrl(String value, String label) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (normalized.length() > 2048) {
            throw new IllegalArgumentException("O link de " + label + " excede o tamanho permitido.");
        }

        try {
            URI uri = URI.create(normalized);
            String host = uri.getHost();
            if (!uri.isAbsolute()
                    || !"https".equalsIgnoreCase(uri.getScheme())
                    || host == null || host.isBlank()
                    || uri.getRawUserInfo() != null
                    || (uri.getPort() != -1 && uri.getPort() != 443)
                    || host.equalsIgnoreCase("localhost")
                    || host.endsWith(".localhost")
                    || host.endsWith(".local")) {
                throw new IllegalArgumentException("Informe um link HTTPS válido para " + label + ".");
            }
            return uri.toASCIIString();
        } catch (IllegalArgumentException exception) {
            if (exception.getMessage() != null && exception.getMessage().startsWith("Informe um link")) {
                throw exception;
            }
            throw new IllegalArgumentException("Informe um link HTTPS válido para " + label + ".");
        }
    }
}
