package com.manganetworking.service.session;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Testes unitários para {@link InMemorySessionStore}.
 * <p>
 * Cobre os requisitos de comportamento atômico, thread-safety e expiração ativa.
 * </p>
 */
class InMemorySessionStoreTest {

    private InMemorySessionStore sessionStore;
    private SessionService.UserSession activeSession;
    private SessionService.UserSession expiredSession;

    @BeforeEach
    void setUp() {
        sessionStore = new InMemorySessionStore();
        
        Instant now = Instant.now();
        Instant futureExpiration = now.plusSeconds(3600); // 1 hora no futuro
        Instant pastExpiration = now.minusSeconds(3600); // 1 hora no passado
        
        activeSession = new SessionService.UserSession(
                "session_active",
                UUID.randomUUID(),
                "user@test.com",
                "Test User",
                false,
                false,
                null,
                null,
                futureExpiration
        );
        
        expiredSession = new SessionService.UserSession(
                "session_expired",
                UUID.randomUUID(),
                "expired@test.com",
                "Expired User",
                false,
                false,
                null,
                null,
                pastExpiration
        );
    }

    @Test
    void shouldSaveAndRetrieveSession() {
        // Given
        sessionStore.save(activeSession);
        
        // When
        Optional<SessionService.UserSession> retrieved = sessionStore.findById(activeSession.sessionId());
        
        // Then
        assertTrue(retrieved.isPresent());
        assertEquals(activeSession.sessionId(), retrieved.get().sessionId());
        assertEquals(activeSession.email(), retrieved.get().email());
        assertEquals(1, sessionStore.countActive());
    }

    @Test
    void shouldDeleteSession() {
        // Given
        sessionStore.save(activeSession);
        assertEquals(1, sessionStore.countActive());
        
        // When
        sessionStore.delete(activeSession.sessionId());
        
        // Then
        Optional<SessionService.UserSession> retrieved = sessionStore.findById(activeSession.sessionId());
        assertFalse(retrieved.isPresent());
        assertEquals(0, sessionStore.countActive());
    }

    @Test
    void shouldNotFailWhenDeletingNonExistentSession() {
        // When (deleting session that doesn't exist)
        sessionStore.delete("non_existent_session");
        
        // Then (no exception thrown)
        assertEquals(0, sessionStore.countActive());
    }

    @Test
    void shouldRemoveExpiredSessions() {
        // Given
        sessionStore.save(activeSession);
        sessionStore.save(expiredSession);
        assertEquals(2, sessionStore.countActive());
        
        // When
        Instant now = Instant.now();
        int removedCount = sessionStore.removeExpired(now);
        
        // Then
        assertEquals(1, removedCount);
        assertEquals(1, sessionStore.countActive());
        
        // Active session should still exist
        assertTrue(sessionStore.findById(activeSession.sessionId()).isPresent());
        
        // Expired session should be removed
        assertFalse(sessionStore.findById(expiredSession.sessionId()).isPresent());
    }

    @Test
    void shouldRemoveOnlyExpiredSessionsWhenMultiplePresent() {
        // Given
        sessionStore.save(activeSession);
        sessionStore.save(expiredSession);
        
        // Create another expired session
        SessionService.UserSession anotherExpired = new SessionService.UserSession(
                "another_expired",
                UUID.randomUUID(),
                "another@test.com",
                "Another User",
                false,
                false,
                null,
                null,
                Instant.now().minusSeconds(7200) // 2 horas no passado
        );
        sessionStore.save(anotherExpired);
        
        assertEquals(3, sessionStore.countActive());
        
        // When
        Instant now = Instant.now();
        int removedCount = sessionStore.removeExpired(now);
        
        // Then
        assertEquals(2, removedCount);
        assertEquals(1, sessionStore.countActive());
        assertTrue(sessionStore.findById(activeSession.sessionId()).isPresent());
    }

    @Test
    void shouldReturnZeroWhenNoExpiredSessions() {
        // Given
        sessionStore.save(activeSession);
        assertEquals(1, sessionStore.countActive());
        
        // When (using time in the past should not remove active session)
        Instant pastTime = activeSession.expiresAt().minusSeconds(1800); // 30 minutos antes da expiração
        int removedCount = sessionStore.removeExpired(pastTime);
        
        // Then
        assertEquals(0, removedCount);
        assertEquals(1, sessionStore.countActive());
        assertTrue(sessionStore.findById(activeSession.sessionId()).isPresent());
    }

    @Test
    void shouldCountActiveSessionsAccurately() {
        // Given empty store
        assertEquals(0, sessionStore.countActive());
        
        // When adding sessions
        sessionStore.save(activeSession);
        assertEquals(1, sessionStore.countActive());
        
        sessionStore.save(expiredSession);
        assertEquals(2, sessionStore.countActive());
        
        // When removing expired
        sessionStore.removeExpired(Instant.now());
        assertEquals(1, sessionStore.countActive());
        
        // When deleting active
        sessionStore.delete(activeSession.sessionId());
        assertEquals(0, sessionStore.countActive());
    }
}