package com.manganetworking.service.work;

import com.manganetworking.service.storage.FilePolicyException;
import org.springframework.http.HttpStatus;

import java.util.regex.Pattern;

/**
 * URLs de imagem da obra (capa e banner).
 *
 * <p>Só aceita arquivo enviado pelo storage da própria plataforma ({@code /api/storage/<uuid>.<ext>}).
 * Isso impede apontar a capa para um endereço externo (phishing/hotlink) e garante que a
 * imagem servida é a que o autor uploaded.</p>
 */
public final class WorkImageUrlPolicy {

    private static final Pattern STORED_IMAGE = Pattern.compile(
            "^/api/storage/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\\.(?:png|jpe?g|webp)$",
            Pattern.CASE_INSENSITIVE);

    private WorkImageUrlPolicy() {
    }

    /**
     * Valida a URL da capa.
     *
     * @param value URL informada
     * @return a URL validada
     * @throws FilePolicyException quando a URL não veio do storage da plataforma
     */
    public static String cover(String value) {
        return validate(value, "A capa");
    }

    /**
     * Valida a URL do banner.
     *
     * @param value URL informada
     * @return a URL validada
     * @throws FilePolicyException quando a URL não veio do storage da plataforma
     */
    public static String banner(String value) {
        return validate(value, "O banner");
    }

    private static String validate(String value, String label) {
        if (value == null || value.isBlank()) {
            throw new FilePolicyException(HttpStatus.BAD_REQUEST, label + " é obrigatório.");
        }
        String normalized = value.trim();
        if (!STORED_IMAGE.matcher(normalized).matches()) {
            throw new FilePolicyException(HttpStatus.BAD_REQUEST,
                    label + " deve ser enviada pelo upload da plataforma.");
        }
        return normalized;
    }
}
