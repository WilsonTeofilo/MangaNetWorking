package com.manganetworking.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.properties.PlatformProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Rate limiting e throttling em memória (por IP e por bucket de rota).
 *
 * <p>Protege a API contra força bruta em autenticação, spam de denúncias e DoS. O armazenamento
 * e expuração de contadores é delegado a {@link RateLimitStore} (porta de domínio), permitindo
 * futura troca para Redis em ambiente distribuído sem alterar a lógica de decisão deste filtro.</p>
 */
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    /** Prefixo das rotas de autenticação sensíveis (limite estrito, anti força bruta). */
    private static final String AUTH_2FA_PATH_PREFIX = "/api/auth/2fa/";
    /** Prefixo das denúncias; apenas o POST é estrito (anti-spam). */
    private static final String REPORTS_PATH_PREFIX = "/api/reports";
    private static final String STORAGE_PATH_PREFIX = "/api/storage/";
    private static final String UPLOADS_PATH_PREFIX = "/api/uploads/";
    /** Prefixo dos comentarios de obra; apenas o POST conta (anti-spam). */
    private static final String COMMENTS_PATH_PREFIX = "/api/works/";
    private static final String BUCKET_AUTH = "auth";
    private static final String BUCKET_GLOBAL = "global";
    /** Bucket de escrita de conteudo do leitor (comentarios): teto proprio, anti-spam. */
    private static final String BUCKET_CONTENT = "content";
    private static final Set<String> STRICT_AUTH_PATHS = Set.of(
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/google",
            "/api/auth/password-reset/request",
            "/api/auth/password-reset/confirm"
    );

    private final PlatformProperties properties;
    private final ObjectMapper objectMapper;
    private final RateLimitStore rateLimitStore;

    public RateLimitingFilter(
            @Autowired(required = false) PlatformProperties properties,
            @Autowired(required = false) ObjectMapper objectMapper,
            @Autowired(required = false) RateLimitStore rateLimitStore
    ) {
        this.properties = properties != null ? properties : new PlatformProperties();
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        // Em produção, InMemoryRateLimitStore (Component) sempre resolve. O fallback protege
        // contextos de teste WebMvcTest onde componentes não-web não são escaneados.
        this.rateLimitStore = rateLimitStore != null ? rateLimitStore : new InMemoryRateLimitStore();
        if (rateLimitStore == null) {
            log.warn("[RATE-LIMIT] RateLimitStore não injetado; usando store privado apenas para teste. "
                    + "Em produção o bean gerenciado é obrigatório.");
        }
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Imagens do leitor e preflight CORS não consomem o bucket de API: um capítulo
        // webtoon dispara dezenas de GETs de página e derrubaria leitores legítimos.
        if (isUnlimitedRequest(path, method)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = extractClientIp(request);
        boolean isStrict = isStrictLimitPath(path, method);
        boolean isContentWrite = isContentWritePath(path, method);
        int maxAllowed = isStrict
                ? properties.getSecurity().getAuthRateLimitPerMinute()
                : isContentWrite
                    ? properties.getSecurity().getContentRateLimitPerMinute()
                    : properties.getSecurity().getRateLimitPerMinute();

        String bucket = isStrict ? BUCKET_AUTH : (isContentWrite ? BUCKET_CONTENT : BUCKET_GLOBAL);
        String key = clientIp + ":" + bucket;
        long currentMinute = System.currentTimeMillis() / 60_000;

        // Expurgo inline no primeiro request do minuto (guarda idempotente dentro do store).
        rateLimitStore.evictStale(currentMinute);

        int currentCount = rateLimitStore.incrementAndGet(key, currentMinute);

        if (currentCount > maxAllowed) {
            writeTooManyRequests(request, response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Limite estrito (15/min) apenas nas operações de credencial. {@code GET /api/auth/me}
     * e {@code POST /api/auth/logout} usam o bucket global: o SPA chama {@code /me} na
     * montagem e um teto de 15/min derrubaria a sessão aparente em NAT/reloads.
     */
    private boolean isStrictLimitPath(String path, String method) {
        if (STRICT_AUTH_PATHS.contains(path) || path.startsWith(AUTH_2FA_PATH_PREFIX)) {
            return true;
        }
        return path.startsWith(REPORTS_PATH_PREFIX) && "POST".equalsIgnoreCase(method);
    }

    /** Escrita de conteudo do leitor (comentario de obra): bucket proprio, mais apertado. */
    private boolean isContentWritePath(String path, String method) {
        if (!"POST".equalsIgnoreCase(method)) {
            return false;
        }
        return path.startsWith(COMMENTS_PATH_PREFIX) && path.endsWith("/comments");
    }

    /** Preflight CORS e entrega de binários não contam contra o throttling de API. */
    private boolean isUnlimitedRequest(String path, String method) {
        if ("OPTIONS".equalsIgnoreCase(method)) {
            return true;
        }
        return "GET".equalsIgnoreCase(method)
                && (path.startsWith(STORAGE_PATH_PREFIX) || path.startsWith(UPLOADS_PATH_PREFIX));
    }

    private void writeTooManyRequests(HttpServletRequest request, HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        // A janela do contador é de 1 minuto; informa os segundos reais até a virada do bucket.
        long secondsToNextBucket = 60 - (Instant.now().getEpochSecond() % 60);
        response.setHeader("Retry-After", String.valueOf(secondsToNextBucket));

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
     * considerado quando {@code platform.security.trust-forwarded-headers} está habilitado
     * (proxy reverso). Usa o hop mais à direita (o último adicionado pelo proxy confiável) e
     * valida o formato — o hop mais à esquerda pode ser forjado pelo cliente.
     */
    private String extractClientIp(HttpServletRequest request) {
        if (properties.getSecurity().isTrustForwardedHeaders()) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                String[] hops = forwardedFor.split(",");
                for (int i = hops.length - 1; i >= 0; i--) {
                    String candidate = hops[i].trim();
                    if (isValidIpLiteral(candidate)) {
                        return candidate;
                    }
                }
            }
        }
        return request.getRemoteAddr();
    }

    /** Aceita apenas literais IPv4/IPv6 (3–45 caracteres) para não criar chaves arbitrárias. */
    private boolean isValidIpLiteral(String candidate) {
        return candidate != null
                && candidate.length() >= 3
                && candidate.length() <= 45
                && candidate.matches("[0-9A-Fa-f:.]+");
    }
}
