package com.manganetworking.util;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Regra do identificador do usuário ({@code username}).
 *
 * <p>O username é a segunda forma de login (além do e-mail) e o endereço público do perfil.
 * Por isso é normalizado (minúsculas), tem tamanho limitado, não aceita caractere de
 * HTML/URL e é imutável depois do cadastro — nada de caractere especial que vire
 * <em>href</em> enganoso ou que quebre a URL da página pública.</p>
 */
public final class UsernamePolicy {

    public static final int MIN_LENGTH = 3;
    public static final int MAX_LENGTH = 30;

    /** Letras minúsculas, números, ponto, hífen e sublinhado; começa e termina alfanumérico. */
    private static final Pattern PATTERN = Pattern.compile("^[a-z0-9][a-z0-9._-]*[a-z0-9]$");

    private UsernamePolicy() {
    }

    /**
     * Canonicaliza e valida o username informado.
     *
     * @param raw identificador como digitado
     * @return o identificador canônico (minúsculas)
     * @throws IllegalArgumentException quando o identificador é ausente ou inválido
     */
    public static String normalize(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("O username é obrigatório.");
        }
        String candidate = raw.trim().toLowerCase(Locale.ROOT);
        if (candidate.length() < MIN_LENGTH || candidate.length() > MAX_LENGTH) {
            throw new IllegalArgumentException(
                    "O username deve ter entre " + MIN_LENGTH + " e " + MAX_LENGTH + " caracteres.");
        }
        if (!PATTERN.matcher(candidate).matches()) {
            throw new IllegalArgumentException(
                    "O username aceita apenas letras minúsculas, números, ponto, hífen e sublinhado.");
        }
        return candidate;
    }

    /**
     * Indica se o username pode ser usado, sem levantar exceção.
     *
     * @param raw identificador como digitado
     * @return {@code true} quando o identificador é válido
     */
    public static boolean isValid(String raw) {
        try {
            normalize(raw);
            return true;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }
}
