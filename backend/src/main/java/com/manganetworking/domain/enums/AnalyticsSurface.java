package com.manganetworking.domain.enums;

import java.util.Locale;

/**
 * Superfícies fechadas de descoberta de uma obra.
 *
 * <p>O cliente informa apenas uma destas categorias — nunca URL, query string ou texto
 * privado. A lista é fechada no servidor: valor desconhecido é rejeitado com 400 em vez
 * de virar uma categoria livre no banco.</p>
 */
public enum AnalyticsSurface {
    /** Feed da home. */
    FEED,
    /** Catálogo completo, sem busca textual. */
    CATALOGO,
    /** Resultado de busca textual (catálogo filtrado). */
    BUSCA,
    /** Bloco de recomendação do produto. */
    RECOMENDACAO,
    /** Página pública de um criador. */
    PERFIL_CRIADOR,
    /** Biblioteca/obras seguidas do próprio leitor. */
    BIBLIOTECA,
    /** Link externo (ex.: rede social) que abriu a obra diretamente. */
    EXTERNO,
    /** Abertura sem origem confiável (link direto, retomada, histórico). */
    DIRETO;

    /**
     * Converte o valor de fio para a categoria fechada.
     *
     * @return categoria ou {@code null} quando o valor não pertence à lista
     */
    public static AnalyticsSurface fromWire(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
