package com.manganetworking.config.security;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.service.session.SessionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Collections;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SecurityContextUtilsTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Deve resolver o ID do usuário diretamente da sessão autenticada ignorando header falsificado")
    void shouldPrioritizeAuthenticatedSessionOverSpoofedHeader() {
        UUID authenticatedUserId = UUID.randomUUID();
        UUID authenticatedCreatorId = UUID.randomUUID();
        UUID spoofedHeaderUserId = UUID.randomUUID();

        SessionService.UserSession session = new SessionService.UserSession(
                "session-123",
                authenticatedUserId,
                "autor@manganetworking.com",
                "Autor Real",
                true,
                authenticatedCreatorId,
                "autor_real",
                Instant.now().plusSeconds(3600)
        );

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                session, null, Collections.emptyList()
        );
        SecurityContextHolder.getContext().setAuthentication(auth);

        // Mesmo que o invasor envie um header com outro UUID, o utilitário retorna o ID autêntico da sessão
        UUID resolvedUserId = SecurityContextUtils.resolveCurrentUserId(spoofedHeaderUserId);
        assertEquals(authenticatedUserId, resolvedUserId);
        assertNotEquals(spoofedHeaderUserId, resolvedUserId);

        UUID resolvedCreatorId = SecurityContextUtils.resolveCurrentCreatorId(UUID.randomUUID());
        assertEquals(authenticatedCreatorId, resolvedCreatorId);
    }

    @Test
    @DisplayName("Deve fazer fallback para header se não houver sessão ativa (ambientes de teste/mock)")
    void shouldFallbackToHeaderWhenNoSessionActive() {
        UUID headerUserId = UUID.randomUUID();
        UUID resolved = SecurityContextUtils.resolveCurrentUserId(headerUserId);
        assertEquals(headerUserId, resolved);
    }

    @Test
    @DisplayName("Deve lançar AccessDeniedException ao tentar agir em nome de outro usuário")
    void shouldThrowWhenAssertingOwnershipOfAnotherUser() {
        UUID authenticatedUserId = UUID.randomUUID();
        SessionService.UserSession session = new SessionService.UserSession(
                "session-123",
                authenticatedUserId,
                "teste@manganetworking.com",
                "Teste",
                false,
                null,
                null,
                Instant.now().plusSeconds(3600)
        );

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(session, null, Collections.emptyList())
        );

        UUID anotherUserId = UUID.randomUUID();
        assertThrows(AccessDeniedException.class, () ->
                SecurityContextUtils.assertOwnership(anotherUserId, "atualizar perfil")
        );
    }
}
