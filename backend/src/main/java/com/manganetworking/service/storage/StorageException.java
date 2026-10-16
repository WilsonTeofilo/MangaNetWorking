package com.manganetworking.service.storage;

/**
 * Falha de infraestrutura no armazenamento de arquivos (disco cheio, diretório indisponível, erro de I/O).
 *
 * <p>Diferente de {@link SecurityException} (arquivo rejeitado por política) e de
 * {@link IllegalArgumentException} (entrada inválida), representa um erro do servidor e é
 * traduzida para HTTP 500 pelo {@code GlobalExceptionHandler}.</p>
 */
public class StorageException extends RuntimeException {

    public StorageException(String message) {
        super(message);
    }

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
