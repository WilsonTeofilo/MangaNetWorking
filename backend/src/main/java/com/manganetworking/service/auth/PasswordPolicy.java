package com.manganetworking.service.auth;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/** Shared server-side password rules. Length counts Unicode code points, not UTF-16 units. */
public final class PasswordPolicy {

    public static final int MIN_CODE_POINTS = 8;
    public static final int MAX_CODE_POINTS = 64;
    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password", "password1", "password123", "senha", "senha123", "senha1234",
            "12345678", "123456789", "qwerty", "qwerty123", "admin", "admin123",
            "letmein", "iloveyou", "welcome", "manga123"
    );
    private static final Set<String> PREDICTABLE_SEQUENCES = Set.of(
            "012345", "123456", "234567", "345678", "abcdef", "qwerty", "asdfgh", "zxcvbn"
    );

    private PasswordPolicy() {}

    public static void validate(String password) {
        if (password == null) {
            throw new IllegalArgumentException("A senha é obrigatória.");
        }

        int length = password.codePointCount(0, password.length());
        if (length < MIN_CODE_POINTS || length > MAX_CODE_POINTS) {
            throw new IllegalArgumentException("A senha deve ter entre 8 e 64 caracteres.");
        }
    }

    /** New credentials must be at least medium; login continues accepting existing credentials. */
    public static void validateNewPassword(String password) {
        validate(password);
        if (strength(password) == Strength.WEAK) {
            throw new IllegalArgumentException(
                    "Senha fraca. Use pelo menos 12 caracteres variados ou uma frase longa e imprevisível."
            );
        }
    }

    public static Strength strength(String password) {
        if (password == null) return Strength.WEAK;
        String source = Normalizer.normalize(password, Normalizer.Form.NFKC);
        String lower = source.toLowerCase(Locale.ROOT);
        String compact = lower.replaceAll("[^\\p{L}\\p{N}]", "");
        int length = password.codePointCount(0, password.length());
        long uniqueCharacters = source.codePoints().distinct().count();
        boolean predictable = COMMON_PASSWORDS.contains(compact)
                || PREDICTABLE_SEQUENCES.stream().anyMatch(compact::contains)
                || uniqueCharacters <= 2;

        boolean hasLower = false;
        boolean hasUpper = false;
        boolean hasDigit = false;
        boolean hasSymbolOrSpace = false;
        for (int offset = 0; offset < source.length();) {
            int point = source.codePointAt(offset);
            hasLower |= Character.isLowerCase(point);
            hasUpper |= Character.isUpperCase(point);
            hasDigit |= Character.isDigit(point);
            hasSymbolOrSpace |= !Character.isLetterOrDigit(point);
            offset += Character.charCount(point);
        }
        int groups = (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSymbolOrSpace ? 1 : 0);

        boolean medium = !predictable && ((length >= 12 && groups >= 2) || (length >= 16 && uniqueCharacters >= 10));
        boolean strong = !predictable && ((length >= 16 && groups >= 3)
                || (length >= 16 && uniqueCharacters >= 12) || (length >= 20 && groups >= 2));
        if (strong) return Strength.STRONG;
        if (medium) return Strength.MEDIUM;
        return Strength.WEAK;
    }

    public enum Strength { WEAK, MEDIUM, STRONG }
}
