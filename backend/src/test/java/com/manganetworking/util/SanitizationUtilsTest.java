package com.manganetworking.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SanitizationUtilsTest {

    @Test
    @DisplayName("Deve remover tags de script maliciosas e schemas javascript")
    void shouldStripScriptTagsAndJavascriptSchemes() {
        String dirty = "<script>alert('xss');</script>A Chama do Dragão";
        String clean = SanitizationUtils.sanitizeText(dirty);
        assertEquals("A Chama do Dragão", clean);

        String linkDirty = "javascript:stealCookies()";
        assertEquals("stealCookies()", SanitizationUtils.sanitizeText(linkDirty));
    }

    @Test
    @DisplayName("Deve remover completamente qualquer tag HTML para campos estritos")
    void shouldStripAllHtmlTags() {
        String html = "<b>Kokuin</b>: <i>A Chama do Destino</i> <script>alert(1)</script>";
        String plain = SanitizationUtils.stripAllHtml(html);
        assertEquals("Kokuin: A Chama do Destino", plain);
    }
}
