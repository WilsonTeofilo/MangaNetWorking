package com.manganetworking.config.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionSecretsGuardTest {

    private static final String VALID_OTP_SECRET = "a-production-only-secret-with-32-bytes!!";
    private static final String VALID_AES_KEY = "a-production-only-aes-256-key-32-bytes!!";
    private static final String VALID_WEBHOOK_SECRET = "a-production-only-webhook-secret-32!!";

    @Test
    void rejectsDevelopmentOtpSecretInProduction() {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> new ProductionSecretsGuard(
                        "manganetworking-local-otp-hmac-secret-change-before-production",
                        VALID_AES_KEY,
                        true,
                        VALID_WEBHOOK_SECRET));
        assertTrue(error.getMessage().contains("OTP_HMAC_SECRET"));
    }

    @Test
    void rejectsShortOtpSecretInProduction() {
        assertThrows(IllegalStateException.class,
                () -> new ProductionSecretsGuard("curto-demais", VALID_AES_KEY, true, VALID_WEBHOOK_SECRET));
    }

    @Test
    void rejectsDevelopmentAesKeyInProduction() {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> new ProductionSecretsGuard(
                        VALID_OTP_SECRET,
                        "MangaNetWorkingLocalDev2026SecureKey!",
                        true,
                        VALID_WEBHOOK_SECRET));
        assertTrue(error.getMessage().contains("AES_SECRET_KEY"));
    }

    @Test
    void rejectsShortAesKeyInProduction() {
        assertThrows(IllegalStateException.class,
                () -> new ProductionSecretsGuard(VALID_OTP_SECRET, "chave-curta", true, VALID_WEBHOOK_SECRET));
    }

    @Test
    void rejectsInsecureCookieFlagInProduction() {
        assertThrows(IllegalStateException.class,
                () -> new ProductionSecretsGuard(VALID_OTP_SECRET, VALID_AES_KEY, false, VALID_WEBHOOK_SECRET));
    }

    @Test
    void rejectsMissingEmailWebhookSecretInProduction() {
        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> new ProductionSecretsGuard(VALID_OTP_SECRET, VALID_AES_KEY, true, ""));
        assertTrue(error.getMessage().contains("EMAIL_WEBHOOK_SECRET"));
    }

    @Test
    void acceptsProductionSecretAndSecureCookie() {
        assertDoesNotThrow(
                () -> new ProductionSecretsGuard(VALID_OTP_SECRET, VALID_AES_KEY, true, VALID_WEBHOOK_SECRET));
    }
}