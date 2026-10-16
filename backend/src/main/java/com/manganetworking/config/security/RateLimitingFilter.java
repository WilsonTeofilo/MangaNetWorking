package com.manganetworking.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.properties.PlatformProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Filtro de Rate Limiting e Throttling em memória.
 * Protege a API contra ataques de força bruta em autenticação, spam de denúncias e DoS.
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final PlatformProperties properties;
    private final ObjectMapper objectMapper;

    private final Map<String, RequestCounter> requestCounts = new ConcurrentHashMap<>();

    public RateLimitingFilter(
            @org.springframework.beans.factory.annotation.Autowired(required = false) PlatformProperties properties,
            @org.springframework.beans.factory.annotation.Autowired(required = false) ObjectMapper objectMapper
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

        boolean isAuthOrReport = path.startsWith("/api/auth/") || path.startsWith("/api/reports");
        int maxAllowed = isAuthOrReport
                ? properties.getSecurity().getAuthRateLimitPerMinute()
                : properties.getSecurity().getRateLimitPerMinute();

        String key = clientIp + ":" + (isAuthOrReport ? "auth" : "global");
        long currentMinute = System.currentTimeMillis() / 60000;

        RequestCounter counter = requestCounts.compute(key, (k, existing) -> {
            if (existing == null || existing.minuteBucket != currentMinute) {
                return new RequestCounter(currentMinute, new AtomicInteger(1));
            }
            existing.count.incrementAndGet();
            return existing;
        });

        if (counter.count.get() > maxAllowed) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");

            Map<String, Object> errorBody = Map.of(
                    "status", 429,
                    "error", "Too Many Requests",
                    "message", "Limite de requisições excedido. Por favor, aguarde alguns instantes antes de tentar novamente."
            );
            response.getWriter().write(objectMapper.writeValueAsString(errorBody));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
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
