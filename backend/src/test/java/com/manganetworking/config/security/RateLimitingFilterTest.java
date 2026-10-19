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
import static org.mockito.ArgumentMatchers.argThat;
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
    private InMemoryRateLimitStore rateLimitStore;

    @BeforeEach
    void setUp() {
        properties = new PlatformProperties();
        properties.getSecurity().setAuthRateLimitPerMinute(3); // Limite baixo para testar
        properties.getSecurity().setRateLimitPerMinute(10);
        rateLimitStore = new InMemoryRateLimitStore();
        rateLimitingFilter = new RateLimitingFilter(properties, new ObjectMapper(), rateLimitStore);
    }

    @Test
    @DisplayName("Deve permitir requisições dentro do limite e barrar com HTTP 429 quando excedido")
    void shouldEnforceRateLimitAndReturn429WhenExceeded() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
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

    @Test
    @DisplayName("X-Forwarded-For forjado não burla o limite quando trust-forwarded-headers=false")
    void shouldIgnoreSpoofedForwardedForByDefault() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getRemoteAddr()).thenReturn("10.0.0.7");
        // O cliente forja um IP diferente por requisição: se o header fosse confiado, cada uma cairia
        // em um bucket distinto e o throttling nunca dispararia.
        lenient().when(request.getHeader("X-Forwarded-For"))
                .thenReturn("203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        for (int i = 0; i < 3; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(429);
        verify(filterChain, times(3)).doFilter(request, response);
    }

    @Test
    @DisplayName("X-Forwarded-For isola buckets quando o proxy reverso é confiável")
    void shouldHonorForwardedForWhenProxyIsTrusted() throws Exception {
        properties.getSecurity().setTrustForwardedHeaders(true);
        properties.getSecurity().setRateLimitPerMinute(1);
        when(request.getRequestURI()).thenReturn("/api/works");
        when(request.getHeader("X-Forwarded-For")).thenReturn("198.51.100.1", "198.51.100.2");

        rateLimitingFilter.doFilterInternal(request, response, filterChain);
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Mesmo limite=1: se o XFF fosse ignorado, a 2ª requisição seria bloqueada.
        verify(filterChain, times(2)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    @DisplayName("X-Forwarded-For usa o hop mais à direita (o adicionado pelo proxy confiável)")
    void shouldUseRightmostForwardedForHop() throws Exception {
        properties.getSecurity().setTrustForwardedHeaders(true);
        properties.getSecurity().setRateLimitPerMinute(1);
        when(request.getRequestURI()).thenReturn("/api/works");
        // O hop da esquerda é forjado pelo cliente; o da direita foi anexado pelo proxy.
        when(request.getHeader("X-Forwarded-For"))
                .thenReturn("203.0.113.9, 10.0.0.5", "203.0.113.77, 10.0.0.5");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        rateLimitingFilter.doFilterInternal(request, response, filterChain);
        rateLimitingFilter.doFilterInternal(request, response, filterChain);

        // Mesmo IP real (10.0.0.5) nas duas: a 2ª excede o limite de 1/min.
        verify(response).setStatus(429);
        verify(filterChain, times(1)).doFilter(request, response);
    }

    @Test
    @DisplayName("GET /api/auth/me usa o bucket global, não o estrito de credenciais")
    void shouldUseGlobalBucketForAuthMe() throws Exception {
        properties.getSecurity().setRateLimitPerMinute(2);
        when(request.getRequestURI()).thenReturn("/api/auth/me");
        when(request.getRemoteAddr()).thenReturn("192.168.1.50");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        for (int i = 0; i < 3; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        // Com o limite estrito (3) nada seria bloqueado; com o global (2), a 3ª cai.
        verify(response).setStatus(429);
        verify(filterChain, times(2)).doFilter(request, response);
    }

    @Test
    @DisplayName("GET de páginas do leitor e preflight CORS não consomem o bucket")
    void shouldNotCountStorageDownloadsAndPreflight() throws Exception {
        properties.getSecurity().setRateLimitPerMinute(1);

        when(request.getRequestURI()).thenReturn("/api/storage/page-01.png");
        when(request.getMethod()).thenReturn("GET");
        for (int i = 0; i < 20; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        when(request.getRequestURI()).thenReturn("/api/works");
        when(request.getMethod()).thenReturn("OPTIONS");
        for (int i = 0; i < 20; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        verify(filterChain, times(40)).doFilter(request, response);
        verify(response, never()).setStatus(429);
    }

    @Test
    @DisplayName("Retry-After informa os segundos restantes da janela de 1 minuto")
    void shouldSendRetryAfterWithRemainingSeconds() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getRemoteAddr()).thenReturn("192.168.1.77");
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));

        for (int i = 0; i < 4; i++) {
            rateLimitingFilter.doFilterInternal(request, response, filterChain);
        }

        verify(response).setHeader(eq("Retry-After"), argThat(value -> {
            int seconds = Integer.parseInt(value);
            return seconds >= 1 && seconds <= 60;
        }));
    }
}
