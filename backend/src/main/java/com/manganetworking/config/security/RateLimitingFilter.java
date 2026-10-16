package com.manganetworking.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.properties.PlatformProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Rate limiting e throttling em memória (por IP e por bucket de rota).
 *
 * <p>Protege a API contra força bruta em autenticação, spam de denúncias e DoS. O mapa de contadores
 * é podado a cada virada de minuto para não crescer indefinidamente.</p>
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    /** Prefixo das rotas de autenticação (limite estrito, anti força bruta). */
    private static final String AUTH_PATH_PREFIX = "/api/auth/";
    /** Prefixo das denúncias; apenas o POST é estrito (anti-spam). */
    private static final String REPORTS_PATH_PREFIX = "/api/reports";
    private static final String BUCKET_AUTH = "auth";
    private static final String BUCKET_GLOBAL = "global";

    private final PlatformProperties properties;
    private final ObjectMapper objectMapper;

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();
    private final AtomicLong lastSweepMinute = new AtomicLong(0);

    public RateLimitingFilter(
            @Autowired(required = false) PlatformProperties properties,
            @Autowired(required = false) ObjectMapper objectMapper
    ) {
        this.properties = properties != null ? properties : new PlatformProperties();
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String clientIp = extractClientIp(request);
        String path = request.getRequestURI();

        boolean isAuthOrReport = path.startsWith(AUTH_PATH_PREFIX) ||
                (path.startsWith(REPORTS_PATH_PREFIX) && "POST".equalsIgnoreCase(request.getMethod()));
        int maxAllowed = isAuthOrReport
                ? properties.getSecurity().getAuthRateLimitPerMinute()
                : properties.getSecurity().getRateLimitPerMinute();

        String bucket = isAuthOrReport ? BUCKET_AUTH : BUCKET_GLOBAL;
        String key = clientIp + ":" + bucket;
        long currentMinute = System.currentTimeMillis() / 60_000;

        evictStaleBuckets(currentMinute);

        RequestCounter counter = requestCounts.compute(key, (k, existing) -> {
            if (existing == null || existing.minuteBucket != currentMinute) {
                return new RequestCounter(currentMinute, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > maxAllowed) {
            writeTooManyRequests(request, response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Remove contadores de minutos anteriores. Sem isso, cada IP visto ficaria retido para sempre
     * (vazamento de memória explorável com uma faixa ampla de IPs).
     */
    private void evictStaleBuckets(long currentMinute) {
        long previous = lastSweepMinute.get();
        if (previous == currentMinute || !lastSweepMinute.compareAndSet(previous, currentMinute)) {
            return;
        }
        requestCounts.entrySet().removeIf(entry -> entry.getValue().minuteBucket < currentMinute);
    }

    private void writeTooManyRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        // A janela do contador é de 1 minuto; avisa o cliente para não tentar de imediato.
        response.setHeader("Retry-After", "60");

        Map<String, Object> errorBody = new LinkedHashMap<>();
        errorBody.put("timestamp", Instant.now().toString());
        errorBody.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        errorBody.put("error", "Too Many Requests");
        errorBody.put("message",
                "Limite de requisições excedido. Por favor, aguarde alguns instantes antes de tentar novamente.");
        errorBody.put("path", request.getRequestURI());

        response.getWriter().write(objectMapper.writeValueAsString(errorBody));
    }

    /**
     * Resolve o IP do cliente. {@code X-Forwarded-For} é um header controlável pelo cliente: só é
     * considerado quando {@code platform.security.trust-forwarded-headers} está habilitado (proxy reverso).
     */
    private String extractClientIp(HttpServletRequest request) {
        if (properties.getSecurity().isTrustForwardedHeaders()) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }

    private static class RequestCounter {
        final long minuteBucket;
        final AtomicInteger count;

        RequestCounter(long minuteBucket, AtomicInteger count) {
            this.minuteBucket = minuteBucket;
            this.count = count;
        }
    }
}
