package com.manganetworking.util;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Regra do identificador do usuário ({@code username}).
 *
 * <p>O username é a segunda forma de login (além do e-mail) e o endereço público do perfil.
 * Por isso é normalizado (minúsculas), tem tamanho limitado, não aceita caractere de
 * HTML/URL e é imutável depois do cadastro — nada de caractere especial que vire
 * <em>href</em> enganoso ou que quebre a URL da página pública.</p>
 *
 * <p>Regras (aplicadas no servidor, nunca só na tela):</p>
 * <ul>
 *   <li>único no banco (a checagem de unicidade fica em {@code AccountIdentityService});</li>
 *   <li>sem espaço em branco — o valor é aparado e espaço interno é recusado;</li>
 *   <li>apenas letras ASCII (a-z), números (0-9), ponto e sublinhado;</li>
 *   <li>sem acentos ou qualquer caractere fora do ASCII;</li>
 *   <li>3 a 30 caracteres;</li>
 *   <li>não começa nem termina com ponto/sublinhado;</li>
 *   <li>sem ponto ou sublinhado repetido (ex.: {@code user..name});</li>
 *   <li>sempre em minúsculas;</li>
 *   <li>sem palavras reservadas do sistema/marca (ex.: {@code admin}, {@code suporte}).</li>
 * </ul>
 */
public final class UsernamePolicy {

    public static final int MIN_LENGTH = 3;
    public static final int MAX_LENGTH = 30;

    /**
     * Blocos alfanuméricos separados por um único ponto ou sublinhado.
     * Um separador só existe entre dois blocos: não há separador no início, no fim
     * nem repetido.
     */
    private static final Pattern PATTERN = Pattern.compile("^[a-z0-9]+(?:[._][a-z0-9]+)*$");

    /**
     * Termos usados para personificar o sistema, a marca ou canais oficiais.
     * A comparação é sempre com o username já canonicalizado (minúsculas).
     */
    private static final Set<String> RESERVED = Set.of(
            "admin", "administrador", "administracao", "root", "owner", "staff", "equipe",
            "suporte", "atendimento", "contato", "ajuda", "sistema", "moderador", "moderacao",
            "oficial", "verificado", "manganetworking", "manga", "mangas", "mangaonline",
            "instagram", "youtube", "tiktok", "twitter", "facebook", "whatsapp", "discord",
            "login", "cadastro", "registro", "conta", "perfil", "usuario", "usuarios",
            "api", "www", "app", "site", "loja", "pagamento", "financeiro", "pix", "vip"
    );

    private UsernamePolicy() {
    }

    /**
     * Canonicaliza e valida o username informado.
     *
     * @param raw identificador como digitado
     * @return o identificador canônico (minúsculas e sem espaços nas pontas)
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
                    "O username aceita apenas letras sem acento, números, ponto e sublinhado — "
                            + "sem espaço, sem símbolo no início/fim e sem ponto ou sublinhado repetido.");
        }
        if (RESERVED.contains(candidate)) {
            throw new IllegalArgumentException(
                    "Este username é reservado para a plataforma. Escolha outro.");
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
