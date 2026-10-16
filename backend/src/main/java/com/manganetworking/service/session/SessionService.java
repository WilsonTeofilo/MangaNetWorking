package com.manganetworking.service.session;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionService {

    public static final String SESSION_COOKIE_NAME = "manganetworking_session";
    public static final Duration SESSION_TTL = Duration.ofDays(7);

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, UserSession> activeSessions = new ConcurrentHashMap<>();

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

        activeSessions.put(sessionId, session);

        // Define Cookie HttpOnly + SameSite=Lax seguro (impossível ler via JS/XSS)
        Cookie cookie = new Cookie(SESSION_COOKIE_NAME, sessionId);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge((int) SESSION_TTL.toSeconds());
        // Em produção HTTPS: cookie.setSecure(true);
        response.addCookie(cookie);

        return session;
    }

    public Optional<UserSession> validateSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return Optional.empty();

        UserSession session = activeSessions.get(sessionId);
        if (session == null) return Optional.empty();

        if (Instant.now().isAfter(session.expiresAt())) {
            activeSessions.remove(sessionId);
            return Optional.empty();
        }

        return Optional.of(session);
    }

    public void revokeSession(String sessionId, HttpServletResponse response) {
        if (sessionId != null) {
            activeSessions.remove(sessionId);
        }
        if (response != null) {
            Cookie cookie = new Cookie(SESSION_COOKIE_NAME, "");
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            cookie.setMaxAge(0);
            response.addCookie(cookie);
        }
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
    ) {}
}
