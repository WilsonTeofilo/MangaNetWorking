package com.manganetworking.config.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class AesCryptoConverterTest {

    private AesCryptoConverter converter;

    @BeforeEach
    void setUp() {
        converter = new AesCryptoConverter();
    }

    @Test
    @DisplayName("Deve criptografar e descriptografar CPF com AES-256-GCM sem corrupção de dados")
    void shouldEncryptAndDecryptCpfCorrectly() {
        String originalCpf = "123.456.789-00";

        String cipherText = converter.convertToDatabaseColumn(originalCpf);
        assertNotNull(cipherText);
        assertNotEquals(originalCpf, cipherText);

        String decrypted = converter.convertToEntityAttribute(cipherText);
        assertEquals(originalCpf, decrypted);
    }

    @Test
    @DisplayName("Deve criptografar e descriptografar chave PIX sensível com integridade")
    void shouldEncryptAndDecryptPixKey() {
        String pixKey = "autor.manga@pix.banco.com.br";

        String cipherText = converter.convertToDatabaseColumn(pixKey);
        assertNotNull(cipherText);

        String decrypted = converter.convertToEntityAttribute(cipherText);
        assertEquals(pixKey, decrypted);
    }

    @Test
    @DisplayName("Deve manter nulos ou vazios inalterados")
    void shouldHandleNullOrBlankGracefully() {
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
        assertEquals("", converter.convertToDatabaseColumn(""));
        assertEquals("", converter.convertToEntityAttribute(""));
    }
}
