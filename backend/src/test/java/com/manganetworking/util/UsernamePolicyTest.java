package com.manganetworking.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regressão do identificador público do usuário: é a segunda via de login e o endereço
 * da página pública, então precisa ser previsível, curto e seguro para URL.
 */
class UsernamePolicyTest {

    @Test
    void normalizesToLowercase() {
        assertEquals("wils.silva", UsernamePolicy.normalize("  Wils.Silva  "));
        assertEquals("wilson", UsernamePolicy.normalize("WILSON"));
    }

    @Test
    void acceptsLettersNumbersDotHyphenAndUnderscore() {
        assertTrue(UsernamePolicy.isValid("wils.silva_01"));
        assertTrue(UsernamePolicy.isValid("teofilo-2"));
    }

    @Test
    void rejectsUnsafeOrMalformedValues() {
        assertFalse(UsernamePolicy.isValid("wils silva"));   // espaço
        assertFalse(UsernamePolicy.isValid("wils@live"));    // arroba
        assertFalse(UsernamePolicy.isValid("<script>"));     // HTML
        assertFalse(UsernamePolicy.isValid("wils/1"));       // barra
        assertFalse(UsernamePolicy.isValid(".wils"));        // ponto no início
        assertFalse(UsernamePolicy.isValid("wils."));        // ponto no fim
        assertFalse(UsernamePolicy.isValid("ab"));           // curto demais
        assertFalse(UsernamePolicy.isValid("a".repeat(31))); // longo demais
        assertFalse(UsernamePolicy.isValid(null));
    }

    @Test
    void throwsWithClearMessage() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> UsernamePolicy.normalize("wils silva"));
        assertTrue(exception.getMessage().contains("username"));
    }
}
