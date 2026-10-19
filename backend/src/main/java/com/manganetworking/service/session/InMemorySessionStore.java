package com.manganetworking.service.session;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Implementação em memória do {@link SessionStore}.
 * <p>
 * Adotando o padrão Strategy/Repository (GoF), permite intercambialidade futura
 * para stores distribuídos (Redis, Banco Relacional) sem modificar regras de negócio.
 * </p>
 * <p>
 * Referências técnicas:
 * <ul>
 *   <li>Strategy Pattern / Repository Pattern (GoF)</li>
 *   <li>Java Concurrency in Practice (Brian Goetz): uso thread-safe de
 *       {@link ConcurrentHashMap} e método {@code size()} O(1) atômico</li>
 *   <li>OWASP Session Management Cheat Sheet: expiração forçada e destruição segura</li>
 * </ul>
 * </p>
 */
@Component
@ConditionalOnProperty(name = "platform.session.store", havingValue = "inmemory", matchIfMissing = true)
public class InMemorySessionStore implements SessionStore {

    private final ConcurrentMap<String, SessionService.UserSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void save(SessionService.UserSession session) {
        sessions.put(session.sessionId(), session);
    }

    @Override
    public Optional<SessionService.UserSession> findById(String sessionId) {
        return Optional.ofNullable(sessions.get(sessionId));
    }

    @Override
    public void delete(String sessionId) {
        sessions.remove(sessionId);
    }

    @Override
    public int removeByUserId(UUID userId) {
        if (userId == null) {
            return 0;
        }
        final int initialSize = sessions.size();
        sessions.entrySet().removeIf(entry -> userId.equals(entry.getValue().userId()));
        return initialSize - sessions.size();
    }

    @Override
    public int removeExpired(Instant now) {
        // Remoção atômica usando entrySet().removeIf() (Java Concurrency in Practice)
        // Garante que operações concorrentes de login/validação não sofram race conditions
        final int initialSize = sessions.size();
        
        sessions.entrySet().removeIf(entry -> {
            SessionService.UserSession session = entry.getValue();
            return now.isAfter(session.expiresAt());
        });
        
        final int finalSize = sessions.size();
        return initialSize - finalSize;
    }

    @Override
    public long countActive() {
        return sessions.size();
    }
}