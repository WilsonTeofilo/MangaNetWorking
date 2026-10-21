package com.manganetworking.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Blindagem dos vínculos sociais do escritor: allowlist de host, HTTPS obrigatório e
 * nada de credencial/porta embutida — o desenho clássico de link malicioso.
 */
class SocialLinkPolicyTest {

    @Test
    void acceptsSupportedSocialNetworks() {
        assertEquals("https://instagram.com/wils", SocialLinkPolicy.sanitize("https://instagram.com/wils"));
        assertEquals("https://youtube.com/@wils", SocialLinkPolicy.sanitize("https://youtube.com/@wils"));
        assertEquals("https://youtu.be/abc", SocialLinkPolicy.sanitize("https://youtu.be/abc"));
        assertEquals("https://behance.net/wils", SocialLinkPolicy.sanitize("https://behance.net/wils"));
    }

    @Test
    void rejectsDangerousSchemes() {
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("javascript:alert(1)"));
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("data:text/html;base64,PHNjcmlwdD4="));
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("http://instagram.com/wils"));
    }

    @Test
    void rejectsUnknownHostsAndCredentialUrls() {
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("https://site-falso.com/wils"));
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("https://instagram.com.evil.com/wils"));
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("https://user@instagram.com/wils"));
        assertThrows(IllegalArgumentException.class, () -> SocialLinkPolicy.sanitize("https://instagram.com:8443/wils"));
    }

    @Test
    void stripsHtmlFromLinkText() {
        // Tag colada é removida e o link válido é aceito — nunca é salvo como HTML.
        assertEquals("https://instagram.com/wils",
                SocialLinkPolicy.sanitize("<b>https://instagram.com/wils</b>"));
        // Com script no meio, sobra lixo e a validação barra.
        assertThrows(IllegalArgumentException.class,
                () -> SocialLinkPolicy.sanitize("javascript:alert(1)"));
    }

    @Test
    void optionalLinkAcceptsEmpty() {
        assertNull(SocialLinkPolicy.sanitizeOptional(null));
        assertNull(SocialLinkPolicy.sanitizeOptional("   "));
    }

    @Test
    void messageNamesTheProblem() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> SocialLinkPolicy.sanitize("http://instagram.com/wils"));
        assertTrue(exception.getMessage().contains("https"));
    }
}
