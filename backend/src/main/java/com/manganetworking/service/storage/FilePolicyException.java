package com.manganetworking.service.storage;

import org.springframework.http.HttpStatus;

/**
 * Arquivo rejeitado por política de conteúdo/segurança do storage.
 *
 * <p>Carrega o status HTTP adequado à rejeição (415 para formato não suportado, 400 para entrada
 * inválida) para não confundir "arquivo recusado" com "credencial ausente" — antes tudo isso era
 * um {@link SecurityException}, que o {@code GlobalExceptionHandler} traduzia para 401.</p>
 */
public class FilePolicyException extends RuntimeException {

    private final HttpStatus status;

    public FilePolicyException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
