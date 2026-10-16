package com.manganetworking.service.session;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SessionServiceTest {

    private SessionService sessionService;

    @BeforeEach
    void setUp() {
        sessionService = new SessionService();
    }

    @Test
    void shouldCreateSessionAndSetHttpOnlyCookie() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("leitor@teste.com");
        user.setName("Leitor Teste");
        user.setCreator(false);

        MockHttpServletResponse response = new MockHttpServletResponse();
        SessionService.UserSession session = sessionService.createSession(user, null, response);

        assertNotNull(session);
        assertNotNull(session.sessionId());
        assertEquals("leitor@teste.com", session.email());

        // Valida o Cookie HttpOnly
        var cookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(cookie);
        assertTrue(cookie.isHttpOnly());
        assertEquals("/", cookie.getPath());
        assertEquals(session.sessionId(), cookie.getValue());
    }

    @Test
    void shouldIncludeModeratorRoleInCreatedSession() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("moderador@teste.com");
        user.setName("Moderador Teste");
        user.setModerator(true);

        SessionService.UserSession session = sessionService.createSession(
                user, null, new MockHttpServletResponse()
        );

        assertTrue(session.isModerator());
    }

    @Test
    void shouldValidateAndRevokeSession() {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("criador@teste.com");
        user.setName("Autor Teste");
        user.setCreator(true);

        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle("autor_teste");

        MockHttpServletResponse response = new MockHttpServletResponse();
        SessionService.UserSession session = sessionService.createSession(user, creator, response);

        // Validação com sucesso
        Optional<SessionService.UserSession> validSession = sessionService.validateSession(session.sessionId());
        assertTrue(validSession.isPresent());
        assertEquals("autor_teste", validSession.get().creatorHandle());

        // Revogação da sessão
        MockHttpServletResponse logoutResponse = new MockHttpServletResponse();
        sessionService.revokeSession(session.sessionId(), logoutResponse);

        // Após logout, sessão não deve mais ser válida
        Optional<SessionService.UserSession> afterLogout = sessionService.validateSession(session.sessionId());
        assertTrue(afterLogout.isEmpty());

        // Cookie expirado com MaxAge 0
        var expiredCookie = logoutResponse.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(expiredCookie);
        assertEquals(0, expiredCookie.getMaxAge());
    }
}
