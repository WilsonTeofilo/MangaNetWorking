package com.manganetworking.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

/**
 * Falha o boot em produção quando um segredo crítico ainda usa o fallback de desenvolvimento.
 * Complementa o {@link ProductionDistributedStoresGuard}, que cobre os stores distribuídos.
 */
@Component
@Profile("prod")
public class ProductionSecretsGuard {

    private static final String DEVELOPMENT_OTP_SECRET =
            "manganetworking-local-otp-hmac-secret-change-before-production";
    private static final String DEVELOPMENT_AES_KEY =
            "MangaNetWorkingLocalDev2026SecureKey!";

    public ProductionSecretsGuard(
            @Value("${platform.security.otp-hmac-secret:}") String otpHmacSecret,
            @Value("${platform.security.aes-secret-key:}") String aesSecretKey,
            @Value("${platform.security.cookie-secure:false}") boolean cookieSecure,
            @Value("${spring.mail.webhook-secret:}") String emailWebhookSecret
    ) {
        if (otpHmacSecret == null
                || otpHmacSecret.isBlank()
                || otpHmacSecret.equals(DEVELOPMENT_OTP_SECRET)
                || otpHmacSecret.length() < 32) {
            throw new IllegalStateException(
                    "O perfil prod exige OTP_HMAC_SECRET próprio, com ao menos 32 bytes; "
                            + "o valor padrão de desenvolvimento é proibido."
            );
        }
        if (aesSecretKey == null
                || aesSecretKey.isBlank()
                || aesSecretKey.equals(DEVELOPMENT_AES_KEY)
                || aesSecretKey.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException(
                    "O perfil prod exige AES_SECRET_KEY própria com ao menos 32 bytes (AES-256); "
                            + "a chave padrão de desenvolvimento é estritamente proibida para proteger dados em repouso (LGPD)."
            );
        }
        if (!cookieSecure) {
            throw new IllegalStateException(
                    "O perfil prod exige COOKIE_SECURE=true para emitir o cookie de sessão apenas em HTTPS."
            );
        }
        if (emailWebhookSecret == null || emailWebhookSecret.isBlank() || emailWebhookSecret.length() < 32) {
            throw new IllegalStateException(
                    "O perfil prod exige EMAIL_WEBHOOK_SECRET com ao menos 32 caracteres; "
                            + "sem ele o webhook de bounce do provedor de e-mail fica indisponível "
                            + "e a reputação do domínio fica sem monitoração."
            );
        }
    }
}