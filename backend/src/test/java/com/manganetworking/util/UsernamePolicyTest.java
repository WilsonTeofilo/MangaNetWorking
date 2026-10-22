package com.manganetworking.util;

import org.junit.jupiter.api.DisplayName;
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
    void normalizesToLowercaseAndTrims() {
        assertEquals("wils.silva", UsernamePolicy.normalize("  Wils.Silva  "));
        assertEquals("wilson", UsernamePolicy.normalize("WILSON"));
        // Espaço no fim não entra no username: é aparado antes da validação.
        assertEquals("wilson", UsernamePolicy.normalize("wilson   "));
    }

    @Test
    void acceptsLettersNumbersDotAndUnderscore() {
        assertTrue(UsernamePolicy.isValid("wils.silva_01"));
        assertTrue(UsernamePolicy.isValid("teofilo2"));
        assertTrue(UsernamePolicy.isValid("a_b"));
    }

    @Test
    void rejectsUnsafeOrMalformedValues() {
        assertFalse(UsernamePolicy.isValid("wils silva"));     // espaço interno
        assertFalse(UsernamePolicy.isValid("wils@live"));      // arroba
        assertFalse(UsernamePolicy.isValid("<script>"));       // HTML
        assertFalse(UsernamePolicy.isValid("wils/1"));         // barra
        assertFalse(UsernamePolicy.isValid(".wils"));          // ponto no início
        assertFalse(UsernamePolicy.isValid("wils."));          // ponto no fim
        assertFalse(UsernamePolicy.isValid("_wils"));          // sublinhado no início
        assertFalse(UsernamePolicy.isValid("wils_"));          // sublinhado no fim
        assertFalse(UsernamePolicy.isValid("wils..silva"));    // pontos repetidos
        assertFalse(UsernamePolicy.isValid("wils__silva"));    // sublinhados repetidos
        assertFalse(UsernamePolicy.isValid("wils._silva"));    // símbolos diferentes seguidos
        assertFalse(UsernamePolicy.isValid("teofilo-2"));      // hífen não é permitido
        assertFalse(UsernamePolicy.isValid("joão"));           // acento
        assertFalse(UsernamePolicy.isValid("a\u0303"));        // letra com marca combinante
        assertFalse(UsernamePolicy.isValid("ab"));             // curto demais
        assertFalse(UsernamePolicy.isValid("a".repeat(31)));   // longo demais
        assertFalse(UsernamePolicy.isValid(null));
        assertFalse(UsernamePolicy.isValid(""));
    }

    @Test
    @DisplayName("Palavras reservadas do sistema e da marca são bloqueadas")
    void rejectsReservedWords() {
        assertFalse(UsernamePolicy.isValid("admin"));
        assertFalse(UsernamePolicy.isValid("ADMIN"));
        assertFalse(UsernamePolicy.isValid(" suporte "));
        assertFalse(UsernamePolicy.isValid("moderador"));
        assertFalse(UsernamePolicy.isValid("instagram"));
        assertFalse(UsernamePolicy.isValid("oficial"));
        assertFalse(UsernamePolicy.isValid("manganetworking"));
        // Prefixo com a palavra reservada não é a palavra em si: pode.
        assertTrue(UsernamePolicy.isValid("adminzinho"));
    }

    @Test
    void throwsWithClearMessage() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> UsernamePolicy.normalize("wils silva"));
        assertTrue(exception.getMessage().contains("username"));

        IllegalArgumentException reserved = assertThrows(IllegalArgumentException.class,
                () -> UsernamePolicy.normalize("admin"));
        assertTrue(reserved.getMessage().contains("reservado"));
    }
}
