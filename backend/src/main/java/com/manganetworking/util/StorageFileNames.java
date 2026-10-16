package com.manganetworking.util;

/**
 * Normalização de tokens de página de capítulo.
 *
 * <p>Há duas representações do mesmo arquivo no sistema: o contrato do leitor guarda a <b>URL</b> da
 * página ({@code /api/storage/<arquivo>}) em {@code chapters.pages_json}, enquanto o guard de storage
 * recebe apenas o <b>nome do arquivo</b> na rota {@code GET /api/storage/{filename}}. Este utilitário
 * converte uma na outra de forma determinística, para que a relação {@code chapter_files} possa ser
 * consultada por igualdade (índice único) em vez de {@code LIKE}.</p>
 */
public final class StorageFileNames {

    private StorageFileNames() {}

    /**
     * Extrai o nome do arquivo de um token de página. Aceita a URL de entrega
     * ({@code /api/storage/abc.png}, {@code /api/uploads/abc.png}) ou o nome puro ({@code abc.png}),
     * e descarta query string e fragmento.
     *
     * @param token token de página (URL ou nome de arquivo)
     * @return o nome do arquivo, ou {@code null} quando o token é nulo, vazio ou não contém arquivo
     */
    public static String fromPageToken(String token) {
        if (token == null) {
            return null;
        }

        String candidate = token.trim();

        int queryIndex = candidate.indexOf('?');
        if (queryIndex >= 0) {
            candidate = candidate.substring(0, queryIndex);
        }
        int fragmentIndex = candidate.indexOf('#');
        if (fragmentIndex >= 0) {
            candidate = candidate.substring(0, fragmentIndex);
        }

        int lastSlash = candidate.lastIndexOf('/');
        if (lastSlash >= 0) {
            candidate = candidate.substring(lastSlash + 1);
        }

        return candidate.isBlank() ? null : candidate;
    }
}
