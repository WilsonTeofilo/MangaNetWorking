package com.manganetworking.service.work;

import com.manganetworking.domain.enums.ChapterType;
import java.text.Normalizer;
import java.util.regex.Pattern;

/** Regras iniciais para capítulos regulares de light novel. */
public final class ProseEditorialPolicy {

    public static final int MIN_VISIBLE_CHARACTERS = 1_000;
    public static final int SHORT_CHAPTER_WARNING_THRESHOLD = 3_000;
    public static final int RECOMMENDED_MIN_CHARACTERS = 6_000;
    public static final int RECOMMENDED_MAX_CHARACTERS = 18_000;
    public static final int MAX_VISIBLE_CHARACTERS = 30_000;
    /** Mínimo para prólogo e conteúdo especial. */
    public static final int SPECIAL_MIN_VISIBLE_CHARACTERS = 300;
    /** Limite defensivo aplicado ao payload antes da remoção de marcação. */
    public static final int MAX_RAW_CHARACTERS = 2_000_000;

    private static final Pattern SCRIPT_TAG = Pattern.compile("<script.*?>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>", Pattern.DOTALL);
    private static final Pattern JAVASCRIPT_SCHEME = Pattern.compile("(?i)javascript:");

    private ProseEditorialPolicy() {}

    /**
     * O formato atualmente persistido é texto simples. Remove marcação como antes,
     * normaliza quebras e Unicode NFC, preservando espaços e pontuação da prosa.
     */
    public static String normalizePlainText(String rawContent) {
        if (rawContent == null) return null;
        if (rawContent.length() > MAX_RAW_CHARACTERS) {
            throw new IllegalArgumentException("O texto enviado excede o limite técnico de processamento.");
        }
        String withoutScripts = SCRIPT_TAG.matcher(rawContent).replaceAll("");
        String withoutMarkup = HTML_TAG.matcher(withoutScripts).replaceAll("");
        String sanitized = JAVASCRIPT_SCHEME.matcher(withoutMarkup).replaceAll("");
        return Normalizer.normalize(sanitized, Normalizer.Form.NFC)
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .strip();
    }

    /** Conta pontos de código Unicode, sem contar pares surrogate como dois caracteres. */
    public static int visibleCharacterCount(String normalizedPlainText) {
        return normalizedPlainText == null ? 0 : normalizedPlainText.codePointCount(0, normalizedPlainText.length());
    }

    public static void validateRegularChapter(String normalizedPlainText) {
        int count = visibleCharacterCount(normalizedPlainText);
        if (count < MIN_VISIBLE_CHARACTERS) {
            throw new IllegalArgumentException("Capítulos regulares de light novel precisam ter pelo menos "
                    + MIN_VISIBLE_CHARACTERS + " caracteres visíveis.");
        }
        if (count > MAX_VISIBLE_CHARACTERS) {
            throw new IllegalArgumentException("Capítulos regulares de light novel podem ter no máximo "
                    + MAX_VISIBLE_CHARACTERS + " caracteres visíveis.");
        }
    }

    /** Valida capítulo do tipo PROLOGUE ou SPECIAL (mínimo 300 caracteres, máximo 30.000). */
    public static void validateSpecialOrPrologueChapter(String normalizedPlainText, ChapterType chapterType) {
        int count = visibleCharacterCount(normalizedPlainText);
        if (count < SPECIAL_MIN_VISIBLE_CHARACTERS) {
            throw new IllegalArgumentException(capitalize(chapterType.name().toLowerCase()) + " precisa ter pelo menos "
                    + SPECIAL_MIN_VISIBLE_CHARACTERS + " caracteres visíveis.");
        }
        if (count > MAX_VISIBLE_CHARACTERS) {
            throw new IllegalArgumentException(capitalize(chapterType.name().toLowerCase()) + " pode ter no máximo "
                    + MAX_VISIBLE_CHARACTERS + " caracteres visíveis.");
        }
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    public static boolean isShortChapter(String normalizedPlainText) {
        return visibleCharacterCount(normalizedPlainText) < SHORT_CHAPTER_WARNING_THRESHOLD;
    }
}
