package com.manganetworking.config.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/**
 * Falha o boot em produção quando um segredo crítico ainda usa o fallback de desenvolvimento.
 * Complementa o {@link ProductionDistributedStoresGuard}, que cobre os stores distribuídos.
 */
@Component
@Profile("prod")
public class ProductionSecretsGuard {

    private static final String DEVELOPMENT_OTP_SECRET =
            "manganetworking-local-otp-hmac-secret-change-before-production";

    public ProductionSecretsGuard(
            @Value("${platform.security.otp-hmac-secret:}") String otpHmacSecret,
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
