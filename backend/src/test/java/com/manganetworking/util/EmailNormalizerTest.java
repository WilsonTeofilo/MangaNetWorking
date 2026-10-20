package com.manganetworking.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regressão da canonicalização de e-mail: o endereço digitado (com espaços e maiúsculas)
 * precisa virar o mesmo endereço canônico em cadastro, login, 2FA e recuperação de senha.
 */
class EmailNormalizerTest {

    @Test
    void removesSurroundingSpacesAndLowercases() {
        assertEquals("wilson.teofilo@example.com",
                EmailNormalizer.normalize("  Wilson.Teofilo@Example.COM  "));
    }

    @Test
    void keepsAlreadyCanonicalAddressUnchanged() {
        assertEquals("pessoa@dominio.com.br", EmailNormalizer.normalize("pessoa@dominio.com.br"));
    }

    @Test
    void acceptsAddressCopiedWithQuotesOrAngleBrackets() {
        assertEquals("pessoa@dominio.com", EmailNormalizer.normalize("\"pessoa@dominio.com\""));
        assertEquals("pessoa@dominio.com", EmailNormalizer.normalize("<pessoa@dominio.com>"));
    }

    @Test
    void rejectsAddressWithInnerSpaces() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> EmailNormalizer.normalize("pessoa da silva@dominio.com"));
        assertTrue(exception.getMessage().contains("espaços"));
    }

    @Test
    void rejectsBlankAddress() {
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("   "));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize(null));
    }

    @Test
    void rejectsMalformedAddresses() {
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("sem-arroba.com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("@dominio.com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa@"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa@dominio"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa@@dominio.com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize(".pessoa@dominio.com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa.@dominio.com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa..nome@dominio.com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa@dominio..com"));
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize("pessoa@-dominio.com"));
    }

    @Test
    void rejectsAddressLongerThanTheRfcLimit() {
        String local = "a".repeat(60);
        String domain = "b".repeat(190) + ".com";
        assertThrows(IllegalArgumentException.class, () -> EmailNormalizer.normalize(local + "@" + domain));
    }

    @Test
    void isValidMirrorsNormalize() {
        assertTrue(EmailNormalizer.isValid("  PESSOA@Dominio.com "));
        assertFalse(EmailNormalizer.isValid("pessoa nome@dominio.com"));
        assertFalse(EmailNormalizer.isValid(null));
    }
}
