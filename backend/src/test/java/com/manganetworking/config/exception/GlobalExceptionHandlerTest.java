package com.manganetworking.config.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

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
}
