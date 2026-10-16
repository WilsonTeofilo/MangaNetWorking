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
                false,
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

    @Test
    @DisplayName("Deve exigir sessão de criador para publicar, sem aceitar header do cliente")
    void shouldRequireCreatorSessionForPublishing() {
        assertThrows(AccessDeniedException.class, SecurityContextUtils::requireCurrentCreatorId);
    }

    @Test
    @DisplayName("Sessão autenticada sem perfil de criador não pode publicar")
    void shouldRejectReaderSessionForPublishing() {
        SessionService.UserSession readerSession = new SessionService.UserSession(
                "session-reader",
                UUID.randomUUID(),
                "leitor@manganetworking.com",
                "Leitor",
                false,
                false,
                null,
                null,
                Instant.now().plusSeconds(3600)
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(readerSession, null, Collections.emptyList())
        );

        assertThrows(AccessDeniedException.class, SecurityContextUtils::requireCurrentCreatorId);
    }

    @Test
    @DisplayName("Deve retornar o creatorId autenticado para publicação")
    void shouldReturnAuthenticatedCreatorId() {
        UUID creatorId = UUID.randomUUID();
        SessionService.UserSession creatorSession = new SessionService.UserSession(
                "session-creator",
                UUID.randomUUID(),
                "autor@manganetworking.com",
                "Autor",
                true,
                false,
                creatorId,
                "autor_real",
                Instant.now().plusSeconds(3600)
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(creatorSession, null, Collections.emptyList())
        );

        assertEquals(creatorId, SecurityContextUtils.requireCurrentCreatorId());
    }

    @Test
    @DisplayName("Deve exigir sessão autenticada para operações financeiras (doação/assinatura)")
    void shouldRequireSessionForFinancialActions() {
        assertThrows(AccessDeniedException.class, SecurityContextUtils::requireCurrentUserId);
    }

    @Test
    @DisplayName("Deve retornar o userId da sessão para operações financeiras, ignorando qualquer corpo/header")
    void shouldReturnAuthenticatedUserIdForFinancialActions() {
        UUID userId = UUID.randomUUID();
        SessionService.UserSession session = new SessionService.UserSession(
                "session-doador",
                userId,
                "doador@manganetworking.com",
                "Doador",
                false,
                false,
                null,
                null,
                Instant.now().plusSeconds(3600)
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(session, null, Collections.emptyList())
        );

        assertEquals(userId, SecurityContextUtils.requireCurrentUserId());
    }
}
