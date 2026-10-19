package com.manganetworking.service.session;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class SessionServiceTest {

    @Mock
    private SessionStore sessionStore;
    
    private SessionService sessionService;
    private UserEntity testUser;
    private CreatorEntity testCreator;

    @BeforeEach
    void setUp() {
        sessionService = new SessionService(sessionStore, new PlatformProperties());
        
        testUser = new UserEntity();
        testUser.setId(UUID.randomUUID());
        testUser.setEmail("user@test.com");
        testUser.setName("Test User");
        testUser.setCreator(true);
        testUser.setModerator(false);
        
        testCreator = new CreatorEntity();
        testCreator.setId(UUID.randomUUID());
        testCreator.setHandle("test_creator");
    }

    @Test
    void shouldCreateSessionAndSetHttpOnlyCookie() {
        // When
        MockHttpServletResponse response = new MockHttpServletResponse();
        SessionService.UserSession session = sessionService.createSession(testUser, testCreator, response);
        
        // Then
        assertNotNull(session);
        assertNotNull(session.sessionId());
        assertEquals("user@test.com", session.email());
        assertEquals(testUser.getId(), session.userId());
        assertEquals(testCreator.getId(), session.creatorId());
        assertEquals("test_creator", session.creatorHandle());
        assertTrue(session.isCreator());
        assertFalse(session.isModerator());
        
        // Verify store interaction
        verify(sessionStore).save(session);
        
        // Validate HttpOnly cookie
        var cookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(cookie);
        assertTrue(cookie.isHttpOnly());
        assertEquals("/", cookie.getPath());
        assertEquals(session.sessionId(), cookie.getValue());
        assertEquals((int) SessionService.SESSION_TTL.toSeconds(), cookie.getMaxAge());
        // SameSite explícito: a decisão de manter CSRF desabilitado depende deste atributo.
        assertEquals("Lax", cookie.getAttribute("SameSite"));
        assertFalse(cookie.getSecure(), "Em HTTP local o atributo Secure fica desligado");
    }

    @Test
    void shouldSetSecureAttributeWhenCookieSecureIsEnabled() {
        // Given
        PlatformProperties properties = new PlatformProperties();
        properties.getSecurity().setCookieSecure(true);
        SessionService secureSessionService = new SessionService(sessionStore, properties);
        MockHttpServletResponse response = new MockHttpServletResponse();

        // When
        secureSessionService.createSession(testUser, testCreator, response);

        // Then
        var cookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(cookie);
        assertTrue(cookie.getSecure(), "Produção/HTTPS deve emitir o cookie com Secure");
        assertEquals("Lax", cookie.getAttribute("SameSite"));
    }

    @Test
    void shouldRevokeAllSessionsForUser() {
        // Given
        UUID userId = UUID.randomUUID();
        when(sessionStore.removeByUserId(userId)).thenReturn(2);

        // When
        int removed = sessionService.revokeSessionsForUser(userId);

        // Then
        assertEquals(2, removed);
        verify(sessionStore).removeByUserId(userId);
    }

    @Test
    void shouldIncludeModeratorRoleInCreatedSession() {
        // Given
        testUser.setModerator(true);
        
        // When
        SessionService.UserSession session = sessionService.createSession(
                testUser, null, new MockHttpServletResponse()
        );
        
        // Then
        assertTrue(session.isModerator());
        verify(sessionStore).save(session);
    }

    @Test
    void shouldValidateValidSession() {
        // Given
        String sessionId = "valid_session_id";
        SessionService.UserSession validSession = new SessionService.UserSession(
                sessionId,
                testUser.getId(),
                testUser.getEmail(),
                testUser.getName(),
                true,
                false,
                testCreator.getId(),
                testCreator.getHandle(),
                Instant.now().plusSeconds(3600) // 1 hora no futuro
        );
        
        when(sessionStore.findById(sessionId)).thenReturn(Optional.of(validSession));
        
        // When
        Optional<SessionService.UserSession> result = sessionService.validateSession(sessionId);
        
        // Then
        assertTrue(result.isPresent());
        assertEquals(validSession, result.get());
        verify(sessionStore).findById(sessionId);
        verify(sessionStore, never()).delete(any());
    }

    @Test
    void shouldReturnEmptyForNullOrBlankSessionId() {
        // When
        Optional<SessionService.UserSession> nullResult = sessionService.validateSession(null);
        Optional<SessionService.UserSession> blankResult = sessionService.validateSession("");
        Optional<SessionService.UserSession> whitespaceResult = sessionService.validateSession("   ");
        
        // Then
        assertTrue(nullResult.isEmpty());
        assertTrue(blankResult.isEmpty());
        assertTrue(whitespaceResult.isEmpty());
        verify(sessionStore, never()).findById(any());
    }

    @Test
    void shouldReturnEmptyForNonExistentSession() {
        // Given
        String nonExistentId = "non_existent";
        when(sessionStore.findById(nonExistentId)).thenReturn(Optional.empty());
        
        // When
        Optional<SessionService.UserSession> result = sessionService.validateSession(nonExistentId);
        
        // Then
        assertTrue(result.isEmpty());
        verify(sessionStore).findById(nonExistentId);
    }

    @Test
    void shouldRemoveAndReturnEmptyForExpiredSession() {
        // Given
        String expiredSessionId = "expired_session";
        SessionService.UserSession expiredSession = new SessionService.UserSession(
                expiredSessionId,
                testUser.getId(),
                testUser.getEmail(),
                testUser.getName(),
                true,
                false,
                null,
                null,
                Instant.now().minusSeconds(3600) // 1 hora no passado
        );
        
        when(sessionStore.findById(expiredSessionId)).thenReturn(Optional.of(expiredSession));
        
        // When
        Optional<SessionService.UserSession> result = sessionService.validateSession(expiredSessionId);
        
        // Then
        assertTrue(result.isEmpty());
        verify(sessionStore).findById(expiredSessionId);
        verify(sessionStore).delete(expiredSessionId);
    }

    @Test
    void shouldRevokeSessionAndClearCookie() {
        // Given
        String sessionId = "session_to_revoke";
        MockHttpServletResponse response = new MockHttpServletResponse();
        
        // When
        sessionService.revokeSession(sessionId, response);
        
        // Then
        verify(sessionStore).delete(sessionId);
        
        // Validate expired cookie
        var expiredCookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(expiredCookie);
        assertTrue(expiredCookie.isHttpOnly());
        assertEquals("/", expiredCookie.getPath());
        assertEquals("", expiredCookie.getValue());
        assertEquals(0, expiredCookie.getMaxAge());
    }

    @Test
    void shouldHandleNullResponseInRevokeSession() {
        // Given
        String sessionId = "session_to_revoke";
        
        // When (should not throw exception)
        sessionService.revokeSession(sessionId, null);
        
        // Then
        verify(sessionStore).delete(sessionId);
    }

    @Test
    void shouldHandleNullSessionIdInRevokeSession() {
        // Given
        MockHttpServletResponse response = new MockHttpServletResponse();
        
        // When (should not throw exception)
        sessionService.revokeSession(null, response);
        
        // Then
        verify(sessionStore, never()).delete(any());
        
        // Cookie should still be cleared
        var expiredCookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(expiredCookie);
        assertEquals(0, expiredCookie.getMaxAge());
    }

    @Test
    void shouldDelegateCleanupToSessionStore() {
        // Given
        when(sessionStore.removeExpired(any(Instant.class))).thenReturn(3);
        
        // When
        sessionService.cleanupExpiredSessions();
        
        // Then
        verify(sessionStore).removeExpired(any(Instant.class));
    }

    @Test
    void shouldGetActiveSessionsCount() {
        // Given
        long expectedCount = 42L;
        when(sessionStore.countActive()).thenReturn(expectedCount);
        
        // When
        long actualCount = sessionService.getActiveSessionsCount();
        
        // Then
        assertEquals(expectedCount, actualCount);
        verify(sessionStore).countActive();
    }
}
