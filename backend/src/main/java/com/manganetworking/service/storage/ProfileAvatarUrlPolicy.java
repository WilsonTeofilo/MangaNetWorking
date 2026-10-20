package com.manganetworking.service.storage;

import java.util.regex.Pattern;

/** Allows profile avatars only from the server-side normalized avatar upload flow. */
public final class ProfileAvatarUrlPolicy {

    private static final Pattern NORMALIZED_AVATAR_PATH = Pattern.compile(
            "^/api/storage/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\\.jpg$");

    private ProfileAvatarUrlPolicy() {}

    public static String validate(String value) {
        if (value == null || value.isBlank()) return null;
        String normalized = value.trim();
        if (!NORMALIZED_AVATAR_PATH.matcher(normalized).matches()) {
            throw new IllegalArgumentException("Avatar deve ser enviado pelo endpoint seguro de upload da plataforma.");
        }
        return normalized;
    }
}
