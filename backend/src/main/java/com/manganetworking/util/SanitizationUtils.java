package com.manganetworking.util;

import java.util.regex.Pattern;

/**
 * Utilitário de sanitização para proteção contra XSS (Cross-Site Scripting)
 * e injeção de tags nocivas em inputs editoriais de mangás, sinopses e comentários.
 */
public final class SanitizationUtils {

    private static final Pattern SCRIPT_TAG_PATTERN = Pattern.compile("<script.*?>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]*>", Pattern.DOTALL);
    private static final Pattern JAVASCRIPT_SCHEME_PATTERN = Pattern.compile("(?i)javascript:");

    private SanitizationUtils() {}

    /**
     * Remove scripts e tags HTML perigosas mantendo o texto limpo
     */
    public static String sanitizeText(String input) {
        if (input == null) return null;
        String cleaned = SCRIPT_TAG_PATTERN.matcher(input).replaceAll("");
        cleaned = JAVASCRIPT_SCHEME_PATTERN.matcher(cleaned).replaceAll("");
        return cleaned.trim();
    }

    /**
     * Remove qualquer tag HTML, permitindo apenas texto plano
     */
    public static String stripAllHtml(String input) {
        if (input == null) return null;
        String withoutScripts = SCRIPT_TAG_PATTERN.matcher(input).replaceAll("");
        String withoutHtml = HTML_TAG_PATTERN.matcher(withoutScripts).replaceAll("");
        return JAVASCRIPT_SCHEME_PATTERN.matcher(withoutHtml).replaceAll("").trim();
    }
}
