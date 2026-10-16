package com.manganetworking.util;

import java.text.Normalizer;

public final class GenreNormalizer {

    private GenreNormalizer() {}

    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        return Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toUpperCase()
                .replace("-", "_")
                .replace(" ", "_");
    }
}
