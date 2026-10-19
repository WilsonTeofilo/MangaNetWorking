package com.manganetworking.service.session;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

/**
 * Serviço de gerenciamento de sessões de usuário.
 * <p>
 * Referências técnicas:
 * <ul>
 *   <li>Clean Architecture: SessionService atua como módulo de alto nível,
 *       dependendo da abstração {@link SessionStore} (Ports & Adapters)</li>
 *   <li>Dependency Inversion Principle (SOLID): injeção por construtor</li>
 *   <li>OWASP Session Management Cheat Sheet: expiração absoluta (Absolute Timeout)
 *       e destruição segura</li>
 *   <li>RFC 6265bis: diretrizes de cookies HttpOnly, SameSite=Lax, Path=/</li>
 *   <li>Spring Framework Reference: uso idiomático de {@code @Scheduled} com
 *       propriedades externalizadas</li>
 * </ul>
 * </p>
 */
@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);

    public static final String SESSION_COOKIE_NAME = "manganetworking_session";
    public static final Duration SESSION_TTL = Duration.ofDays(7);

    private final SecureRandom secureRandom = new SecureRandom();
    private final SessionStore sessionStore;
    private final PlatformProperties properties;

    /**
     * Construtor com injeção de dependência por construtor (Clean Code).
     * <p>
     * Segue o princípio SOLID: alta coesão e baixo acoplamento.
     * </p>
     */
    public SessionService(SessionStore sessionStore, PlatformProperties properties) {
        this.sessionStore = sessionStore;
        this.properties = properties;
    }

    public UserSession createSession(UserEntity user, CreatorEntity creator, HttpServletResponse response) {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String sessionId = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        Instant expiresAt = Instant.now().plus(SESSION_TTL);
        UserSession session = new UserSession(
                sessionId,
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.isCreator(),
                user.isModerator(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getHandle() : null,
                expiresAt
        );

        sessionStore.save(session);

        response.addCookie(buildSessionCookie(sessionId, (int) SESSION_TTL.toSeconds()));

        return session;
    }

    /**
     * Monta o cookie de sessão com os atributos de segurança definidos na ADR-002.
     * <p>
     * {@code SameSite=Lax} é declarado explicitamente (a decisão de manter o CSRF
     * desabilitado depende deste atributo, e não do default do navegador). {@code Secure}
     * é controlado por {@code platform.security.cookie-secure} — obrigatório em HTTPS/produção.
     * </p>
     */
    private Cookie buildSessionCookie(String value, int maxAgeSeconds) {
        Cookie cookie = new Cookie(SESSION_COOKIE_NAME, value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAgeSeconds);
        cookie.setSecure(properties.getSecurity().isCookieSecure());
        cookie.setAttribute("SameSite", "Lax");
        return cookie;
    }

    public Optional<UserSession> validateSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return Optional.empty();

        Optional<UserSession> sessionOpt = sessionStore.findById(sessionId);
        if (sessionOpt.isEmpty()) return Optional.empty();

        UserSession session = sessionOpt.get();
        if (Instant.now().isAfter(session.expiresAt())) {
            sessionStore.delete(sessionId);
            return Optional.empty();
        }

        return Optional.of(session);
    }

    public void revokeSession(String sessionId, HttpServletResponse response) {
        if (sessionId != null) {
            sessionStore.delete(sessionId);
        }
        if (response != null) {
            response.addCookie(buildSessionCookie("", 0));
        }
    }

    /**
     * Revoga todas as sessões de um usuário (exclusão de conta / direito ao esquecimento).
     * <p>
     * Sem isto, o cookie emitido antes da anonimização continuaria autenticando por até
     * {@link #SESSION_TTL} e o {@link UserSession} manteria nome/e-mail do titular em memória.
     * </p>
     *
     * @param userId identificador do usuário
     * @return quantidade de sessões revogadas
     */
    public int revokeSessionsForUser(UUID userId) {
        int removed = sessionStore.removeByUserId(userId);
        if (removed > 0) {
            log.info("[SESSION] Revogadas {} sessões do usuário {} (exclusão de conta/LGPD)", removed, userId);
        }
        return removed;
    }

    /**
     * Rotina de limpeza ativa de sessões expiradas.
     * <p>
     * Executa periodicamente conforme configurado em {@code platform.security.session-cleanup-interval-ms}
     * para prevenir memory leaks e esgotamento de recursos (OWASP Unbounded Memory Allocation).
     * </p>
     * <p>
     * Referência Spring Framework: uso idiomático de {@code @Scheduled} com propriedades
     * externalizadas, evitando polling excessivo (default: 1 hora).
     * </p>
     */
    @Scheduled(fixedDelayString = "${platform.security.session-cleanup-interval-ms}")
    public void cleanupExpiredSessions() {
        Instant now = Instant.now();
        int removedCount = sessionStore.removeExpired(now);
        
        // Log informativo apenas quando houver sessões limpas (evita poluição de logs)
        if (removedCount > 0) {
            log.info("[SESSION-CLEANUP] Removidas {} sessões expiradas em {}", removedCount, now);
        } else if (log.isDebugEnabled()) {
            log.debug("[SESSION-CLEANUP] Nenhuma sessão expirada para remover em {}", now);
        }
    }

    /**
     * Retorna estatísticas atuais de sessões (para monitoramento).
     * <p>
     * Método útil para endpoints de health check ou admin.
     * </p>
     *
     * @return quantidade de sessões ativas
     */
    public long getActiveSessionsCount() {
        return sessionStore.countActive();
    }

    public record UserSession(
            String sessionId,
            UUID userId,
            String email,
            String name,
            boolean isCreator,
            boolean isModerator,
            UUID creatorId,
            String creatorHandle,
            Instant expiresAt
    ) {
        public boolean isExpired() {
            return expiresAt != null && expiresAt.isBefore(Instant.now());
        }
    }
}
