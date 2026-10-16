package com.manganetworking.config.exception;

import com.manganetworking.service.storage.FilePolicyException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingServletRequestParameterException;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void shouldFormatSecurityExceptionWithOrderedLinkedHashMap() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/login");

        SecurityException ex = new SecurityException("Credenciais inválidas");
        ResponseEntity<Map<String, Object>> response = handler.handleSecurityException(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(401, body.get("status"));
        assertEquals("Unauthorized", body.get("error"));
        assertEquals("Credenciais inválidas", body.get("message"));
        assertEquals("/api/auth/login", body.get("path"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void shouldFormatResourceNotFoundException() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/works/999");

        ResourceNotFoundException ex = new ResourceNotFoundException("Obra não encontrada com ID 999");
        ResponseEntity<Map<String, Object>> response = handler.handleResourceNotFoundException(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(404, body.get("status"));
        assertEquals("Not Found", body.get("error"));
        assertEquals("Obra não encontrada com ID 999", body.get("message"));
    }

    @Test
    void shouldFormatMissingRequestParameterAsBadRequest() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/dev/outbox/latest");

        MissingServletRequestParameterException ex =
                new MissingServletRequestParameterException("email", "String");
        ResponseEntity<Map<String, Object>> response = handler.handleMissingParameter(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.get("status"));
        assertEquals("Bad Request", body.get("error"));
        assertEquals("Parâmetro obrigatório ausente: email", body.get("message"));
        assertEquals("/api/dev/outbox/latest", body.get("path"));
    }

    @Test
    void shouldMapFilePolicyExceptionToItsOwnStatus() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/storage/upload");

        FilePolicyException ex = new FilePolicyException(
                HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Formato de arquivo não suportado.");
        ResponseEntity<Map<String, Object>> response = handler.handleFilePolicy(ex, request);

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(415, body.get("status"));
        assertEquals("Unsupported Media Type", body.get("error"));
    }

    @Test
    void shouldMapUnsupportedMethodTo405() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/works");

        HttpRequestMethodNotSupportedException ex =
                new HttpRequestMethodNotSupportedException("PATCH");
        ResponseEntity<Map<String, Object>> response = handler.handleMethodNotSupported(ex, request);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        Map<String, Object> body = response.getBody();
        assertNotNull(body);
        assertEquals(405, body.get("status"));
        assertEquals("Method Not Allowed", body.get("error"));
    }
}
