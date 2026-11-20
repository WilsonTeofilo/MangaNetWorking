package com.manganetworking.config.security;

import com.manganetworking.service.session.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;

/**
 * Defesa CSRF para requisições mutáveis autenticadas pelo cookie de sessão.
 *
 * <p>A API continua stateless e não cria token CSRF no cliente. Para uma chamada de navegador
 * que traz {@code manganetworking_session}, a origem precisa pertencer à allow-list de CORS.
 * Requisições sem o cookie (por exemplo, webhooks assinados) não entram nesta regra. Clientes não
 * browser, que não enviam {@code Origin} nem {@code Sec-Fetch-Site}, permanecem compatíveis.</p>
 */
public class CookieOriginCsrfFilter extends OncePerRequestFilter {

    private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final Set<String> trustedOrigins;

    public CookieOriginCsrfFilter(Set<String> trustedOrigins) {
        this.trustedOrigins = Set.copyOf(trustedOrigins);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        if (SAFE_METHODS.contains(request.getMethod()) || !hasSessionCookie(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String origin = request.getHeader("Origin");
        boolean browserRequest = origin != null || request.getHeader("Sec-Fetch-Site") != null;
        if (!browserRequest) {
            filterChain.doFilter(request, response);
            return;
        }

        if (origin == null || !trustedOrigins.contains(origin)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Origem não autorizada para esta ação.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean hasSessionCookie(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        return cookies != null && Arrays.stream(cookies)
                .anyMatch(cookie -> SessionService.SESSION_COOKIE_NAME.equals(cookie.getName()));
    }
}
