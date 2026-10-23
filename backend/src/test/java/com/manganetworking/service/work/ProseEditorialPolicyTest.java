package com.manganetworking.service.work;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ProseEditorialPolicyTest {

    @Test
    @DisplayName("Conta code points e preserva espaços/quebras após normalização NFC")
    void countsUnicodeCodePointsAfterNormalization() {
        String normalized = ProseEditorialPolicy.normalizePlainText("A😀e\u0301\r\n B!");

        assertEquals("A😀é\n B!", normalized);
        assertEquals(7, ProseEditorialPolicy.visibleCharacterCount(normalized));
    }

    @Test
    @DisplayName("Valida limite mínimo e máximo inclusivos para capítulo regular")
    void validatesInclusiveBoundaries() {
        assertDoesNotThrow(() -> ProseEditorialPolicy.validateRegularChapter("x".repeat(1_000)));
        assertDoesNotThrow(() -> ProseEditorialPolicy.validateRegularChapter("x".repeat(30_000)));
        assertThrows(IllegalArgumentException.class,
                () -> ProseEditorialPolicy.validateRegularChapter("x".repeat(999)));
        assertThrows(IllegalArgumentException.class,
                () -> ProseEditorialPolicy.validateRegularChapter("x".repeat(30_001)));
    }

    @Test
    @DisplayName("Marca capítulos abaixo de 3.000 como curtos, sem torná-los inválidos")
    void shortChapterWarningIsNotBlockingRule() {
        String shortText = "x".repeat(2_999);

        assertTrue(ProseEditorialPolicy.isShortChapter(shortText));
        assertDoesNotThrow(() -> ProseEditorialPolicy.validateRegularChapter(shortText));
        assertFalse(ProseEditorialPolicy.isShortChapter("x".repeat(3_000)));
    }

    @Test
    @DisplayName("Remove HTML antes da contagem e rejeita payload bruto acima do teto defensivo")
    void stripsMarkupAndRejectsHugeRawPayload() {
        assertEquals("Narrativa", ProseEditorialPolicy.normalizePlainText("<b>Narrativa</b>"));
        assertThrows(IllegalArgumentException.class,
                () -> ProseEditorialPolicy.normalizePlainText("x".repeat(ProseEditorialPolicy.MAX_RAW_CHARACTERS + 1)));
    }
}
