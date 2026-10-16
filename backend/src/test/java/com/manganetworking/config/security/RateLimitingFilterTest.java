package com.manganetworking.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.properties.PlatformProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RateLimitingFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private RateLimitingFilter rateLimitingFilter;
    private PlatformProperties properties;

    @BeforeEach
    void setUp() {
        properties = new PlatformProperties();
        properties.getSecurity().setAuthRateLimitPerMinute(3); // Limite baixo para testar
        properties.getSecurity().setRateLimitPerMinute(10);
        rateLimitingFilter = new RateLimitingFilter(properties, new ObjectMapper());
    }

    @Test
    @DisplayName("Deve permitir requisições dentro do limite e barrar com HTTP 429 quando excedido")
    void shouldEnforceRateLimitAndReturn429WhenExceeded() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getHeader("X-Forwarded-For")).thenReturn(null);
        when(request.getRemoteAddr()).thenReturn("192.168.1.100");

        StringWriter stringWriter = new StringWriter();
        PrintWriter writer = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(writer);

        // 3 requisições permitidas
        for (int i = 0; i < 3; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }
        verify(filterChain, times(3)).doFilter(request, response);

        // 4ª requisição deve ser bloqueada com 429 Too Many Requests
        rateLimitingFilter.doFilterInternal(request, response, filterChain);
        verify(response).setStatus(429);
        assertTrue(stringWriter.toString().contains("Too Many Requests"));
    }
}
