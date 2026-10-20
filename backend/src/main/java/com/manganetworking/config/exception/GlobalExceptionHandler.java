package com.manganetworking.config.exception;

import com.manganetworking.service.storage.FilePolicyException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Tratamento centralizado de erros da API.
 *
 * <p>Toda resposta de erro é montada por {@link #baseBody} em um {@link LinkedHashMap}, garantindo
 * contrato único (`timestamp`, `status`, `error`, `message`, `path`) e ordem estável na serialização.
 * Os controllers não capturam exceções: eles apenas lançam exceções de domínio e este advice as traduz
 * para o HTTP status correto.</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String KEY_TIMESTAMP = "timestamp";
    private static final String KEY_STATUS = "status";
    private static final String KEY_ERROR = "error";
    private static final String KEY_MESSAGE = "message";
    private static final String KEY_PATH = "path";
    private static final String KEY_ERRORS = "errors";

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationExceptions(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        Map<String, Object> body = baseBody(
                HttpStatus.BAD_REQUEST, "Bad Request",
                "Falha de validação nos campos informados", request);
        body.put(KEY_ERRORS, fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /** Exceções com status HTTP explícito (ex.: throttle 429) preservam o status e o motivo. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            ResponseStatusException ex, HttpServletRequest request
    ) {
        HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
        if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
        String message = ex.getReason() == null ? status.getReasonPhrase() : ex.getReason();
        return build(status, status.getReasonPhrase(), message, request);
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurityException(
            SecurityException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.UNAUTHORIZED, "Unauthorized", ex.getMessage(), request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDeniedException(
            AccessDeniedException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage(), request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgumentException(
            IllegalArgumentException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request", ex.getMessage(), request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFoundException(
            ResourceNotFoundException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage(), request);
    }

    /** Parâmetro obrigatório ausente na query string (ex.: `?email=`). */
    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, Object>> handleMissingParameter(
            MissingServletRequestParameterException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request",
                "Parâmetro obrigatório ausente: " + ex.getParameterName(), request);
    }

    /** Corpo ausente, JSON malformado ou tipo incompatível no payload. */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleUnreadableBody(
            HttpMessageNotReadableException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request",
                "Corpo da requisição ausente ou em formato inválido.", request);
    }

    /** Upload maior que o limite do container multipart. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleMaxUploadSizeExceeded(
            MaxUploadSizeExceededException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.PAYLOAD_TOO_LARGE, "Payload Too Large",
                "O arquivo enviado excede o tamanho máximo permitido.", request);
    }

    /** Rejeição de arquivo por política de conteúdo (formato não suportado, magic bytes, path traversal). */
    @ExceptionHandler(FilePolicyException.class)
    public ResponseEntity<Map<String, Object>> handleFilePolicy(
            FilePolicyException ex, HttpServletRequest request
    ) {
        HttpStatus status = ex.getStatus();
        return build(status, status.getReasonPhrase(), ex.getMessage(), request);
    }

    /** Negação de acesso por regra de método (@PreAuthorize) — Spring Security. */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleSpringAccessDenied(
            org.springframework.security.access.AccessDeniedException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.FORBIDDEN, "Forbidden", ex.getMessage(), request);
    }

    /** Rota inexistente → 404 (sem log de erro, é erro do cliente). */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNoResourceFound(
            NoResourceFoundException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.NOT_FOUND, "Not Found", "Recurso não encontrado.", request);
    }

    /** Método HTTP não suportado pela rota → 405. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.METHOD_NOT_ALLOWED, "Method Not Allowed",
                "Método HTTP não suportado para esta rota.", request);
    }

    /** Content-Type da requisição não suportado → 415. */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, Object>> handleMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unsupported Media Type",
                "Content-Type da requisição não suportado.", request);
    }

    /** Parte multipart ausente (ex.: campo `file`) → 400. */
    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, Object>> handleMissingPart(
            MissingServletRequestPartException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request",
                "Parte obrigatória ausente na requisição multipart: " + ex.getRequestPartName(), request);
    }

    /** Parâmetro com tipo incompatível (ex.: UUID malformado no path) → 400. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request
    ) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request",
                "Parâmetro inválido: " + ex.getName(), request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneralException(
            Exception ex, HttpServletRequest request
    ) {
        // Loga a stack trace completa; o cliente recebe apenas uma mensagem genérica (não vaza detalhe interno).
        log.error("Erro interno inesperado em {} {}", request.getMethod(), request.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Internal Server Error",
                "Ocorreu um erro interno inesperado no servidor", request);
    }

    /** Atalho para respostas de erro sem campo adicional. */
    private ResponseEntity<Map<String, Object>> build(
            HttpStatus status, String error, String message, HttpServletRequest request
    ) {
        return ResponseEntity.status(status).body(baseBody(status, error, message, request));
    }

    /** Corpo de erro padronizado; a ordem dos campos é preservada pelo LinkedHashMap. */
    private Map<String, Object> baseBody(
            HttpStatus status, String error, String message, HttpServletRequest request
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(KEY_TIMESTAMP, Instant.now().toString());
        body.put(KEY_STATUS, status.value());
        body.put(KEY_ERROR, error);
        body.put(KEY_MESSAGE, message);
        body.put(KEY_PATH, request.getRequestURI());
        return body;
    }
}
