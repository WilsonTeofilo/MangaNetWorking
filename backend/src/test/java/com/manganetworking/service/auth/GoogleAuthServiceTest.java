package com.manganetworking.service.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class GoogleAuthServiceTest {

    @Test
    void shouldThrowWhenClientIdIsBlank() {
        GoogleAuthService service = new GoogleAuthService("", false);
        assertThrows(IllegalStateException.class, () -> service.verifyToken("invalid-token"));
    }

    @Test
    void shouldAuthenticateWithStagingMockTokenWhenEnabled() {
        GoogleAuthService service = new GoogleAuthService("test-client-id", true);
        GoogleAuthService.GoogleTokenClaims claims = service.verifyToken("STAGING_GOOGLE_TOKEN:leitor.teste@manganetworking.com:Leitor Teste");

        assertNotNull(claims);
        assertEquals("leitor.teste@manganetworking.com", claims.email());
        assertEquals("Leitor Teste", claims.name());
        assertEquals("/api/storage/avatar-default.png", claims.picture());
        assertTrue(claims.subject().startsWith("staging-google-sub-"));
    }

    @Test
    void shouldRejectInvalidTokenWhenMockIsDisabled() {
        GoogleAuthService service = new GoogleAuthService("test-client-id", false);
        assertThrows(SecurityException.class, () -> service.verifyToken("token-falso-que-nao-passa-na-assinatura"));
    }
}
