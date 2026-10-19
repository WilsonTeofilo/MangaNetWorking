package com.manganetworking.config.properties;

import com.manganetworking.config.security.AesCryptoConverter;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class PlatformPropertiesTest {

    @AfterEach
    void tearDown() {
        AesCryptoConverter.resetKey();
    }

    @Test
    @DisplayName("Deve configurar chave customizada no AesCryptoConverter quando fornecida nas propriedades")
    void shouldConfigureCustomKeyInConverterWhenProvided() {
        PlatformProperties properties = new PlatformProperties();
        properties.getSecurity().setAesSecretKey("MinhaChaveSecretaDeTeste2026AES!");

        properties.init();

        // Verifica que o converter utiliza a chave customizada cifrando e decifrando sem erro
        AesCryptoConverter converter = new AesCryptoConverter();
        String original = "123.456.789-10";
        String encrypted = converter.convertToDatabaseColumn(original);
        assertNotNull(encrypted);
        assertEquals(original, converter.convertToEntityAttribute(encrypted));
    }

    @Test
    @DisplayName("Deve falhar no fail-fast caso ambiente seja prod e AES_SECRET_KEY esteja vazia")
    void shouldFailFastInProductionWhenAesKeyIsMissing() {
        PlatformProperties properties = new PlatformProperties();
        MockEnvironment mockEnv = new MockEnvironment();
        mockEnv.setActiveProfiles("prod");
        properties.setEnvironment(mockEnv);
        properties.getSecurity().setAesSecretKey("");

        IllegalStateException ex = assertThrows(IllegalStateException.class, properties::init);
        assertTrue(ex.getMessage().contains("[SEGURANÇA CRÍTICA] Perfil 'prod' ativo"));
    }

    @Test
    @DisplayName("Deve permitir inicialização em perfis de desenvolvimento/teste mesmo sem chave customizada")
    void shouldAllowDefaultProfileWithoutCustomKey() {
        PlatformProperties properties = new PlatformProperties();
        MockEnvironment mockEnv = new MockEnvironment();
        mockEnv.setActiveProfiles("dev");
        properties.setEnvironment(mockEnv);
        properties.getSecurity().setAesSecretKey(null);

        assertDoesNotThrow(properties::init);
    }

    @Test
    @DisplayName("Deve manter consistência padrão das porcentagens da plataforma (17% + 83% = 100%)")
    void shouldMaintainFinancialConsistencyByDefault() {
        PlatformProperties properties = new PlatformProperties();
        assertEquals(new BigDecimal("0.17"), properties.getFeePercentage());
        assertEquals(new BigDecimal("0.83"), properties.getCreatorSharePercentage());
        assertEquals(0, properties.getFeePercentage().add(properties.getCreatorSharePercentage()).compareTo(BigDecimal.ONE));
    }
}
