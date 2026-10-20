package com.manganetworking.util;

import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Regra única de canonicalização e validação de endereço de e-mail do MangaNetWorking.
 *
 * <p>O endereço digitado pelo usuário nunca é usado "como veio": ele é canonicalizado
 * (espaços removidos, tudo em minúsculas) antes de qualquer comparação, busca ou gravação.
 * Isso evita contas duplicadas por diferença de caixa ou espaço, garante que o e-mail
 * usado no login seja o mesmo do cadastro e faz a supressão de entrega (bounce) e a
 * recuperação de senha apontarem sempre para o mesmo endereço.</p>
 *
 * <p>O que a regra <strong>não</strong> faz, de propósito:</p>
 * <ul>
 *   <li>não remove pontos nem tags {@code +} da parte local: isso só vale para alguns
 *       provedores e quebraria o vínculo com a conta real em outros;</li>
 *   <li>não "adivinha" domínios (typos como {@code gmial.com} continuam inválidos): o
 *       usuário recebe erro explícito em vez de um código para um endereço inexistente.</li>
 * </ul>
 *
 * <p>Falhas de validação usam {@link IllegalArgumentException}, traduzida em HTTP 400
 * pelo {@code GlobalExceptionHandler} — nunca 500.</p>
 */
public final class EmailNormalizer {

    /** Limite máximo do endereço completo (RFC 5321). */
    public static final int MAX_LENGTH = 254;

    /** Limite máximo da parte local (RFC 5321). */
    public static final int MAX_LOCAL_LENGTH = 64;

    /** Parte local: átomos RFC 5322 separados por ponto, sem ponto no início/fim/dobrado. */
    private static final Pattern LOCAL_PART = Pattern.compile(
            "^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$");

    /** Domínio: rótulos válidos separados por ponto e TLD alfabético. */
    private static final Pattern DOMAIN = Pattern.compile(
            "^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\\.)+[A-Za-z]{2,63}$");

    /** Qualquer caractere de espaço (inclusive não separável) é proibido dentro do endereço. */
    private static final Pattern ANY_WHITESPACE = Pattern.compile(".*\\s.*", Pattern.DOTALL);

    private EmailNormalizer() {
    }

    /**
     * Canonicaliza um endereço informado pelo usuário.
     *
     * @param raw endereço como digitado (pode ter espaços nas pontas e maiúsculas)
     * @return o endereço canônico (minúsculas, sem espaços), pronto para persistir
     * @throws IllegalArgumentException quando o endereço é ausente ou inválido
     */
    public static String normalize(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }

        String candidate = strip(raw.strip());
        if (candidate.isEmpty()) {
            throw new IllegalArgumentException("O e-mail é obrigatório.");
        }
        if (candidate.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("O e-mail excede o limite de " + MAX_LENGTH + " caracteres.");
        }
        if (ANY_WHITESPACE.matcher(candidate).matches()) {
            throw new IllegalArgumentException("O e-mail não pode conter espaços.");
        }

        String normalized = candidate.toLowerCase(Locale.ROOT);
        int separator = normalized.lastIndexOf('@');
        if (separator <= 0 || separator == normalized.length() - 1) {
            throw new IllegalArgumentException("Formato de e-mail inválido.");
        }

        String local = normalized.substring(0, separator);
        String domain = normalized.substring(separator + 1);
        if (local.length() > MAX_LOCAL_LENGTH) {
            throw new IllegalArgumentException("O e-mail excede o limite de " + MAX_LOCAL_LENGTH
                    + " caracteres antes do @.");
        }
        if (!LOCAL_PART.matcher(local).matches()) {
            throw new IllegalArgumentException("Formato de e-mail inválido.");
        }
        if (!DOMAIN.matcher(domain).matches()) {
            throw new IllegalArgumentException("Formato de e-mail inválido.");
        }
        return normalized;
    }

    /**
     * Indica se o endereço informado é válido sem levantar exceção.
     *
     * @param raw endereço como digitado
     * @return {@code true} quando o endereço pode ser canonicalizado
     */
    public static boolean isValid(String raw) {
        try {
            normalize(raw);
            return true;
        } catch (IllegalArgumentException invalid) {
            return false;
        }
    }

    /**
     * Remove aspas e chevrons que às vezes vêm colados em um "copiar e colar"
     * (por exemplo {@code "<pessoa@dominio.com>"}).
     */
    private static String strip(String value) {
        String result = value;
        if (result.length() >= 2 && result.startsWith("\"") && result.endsWith("\"")) {
            result = result.substring(1, result.length() - 1).strip();
        }
        if (result.length() >= 2 && result.startsWith("<") && result.endsWith(">")) {
            result = result.substring(1, result.length() - 1).strip();
        }
        return result;
    }
}
