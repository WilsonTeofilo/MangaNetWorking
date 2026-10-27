package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

class MercadoPagoWebhookValidatorTest {

    private PlatformProperties properties;
    private MercadoPagoWebhookValidator validator;
    private final String secret = "test-webhook-secret-key-123";

    @BeforeEach
    void setUp() {
        properties = new PlatformProperties();
        properties.getMercadopago().setWebhookSecret(secret);
        validator = new MercadoPagoWebhookValidator(properties);
    }

    @Test
    @DisplayName("Assinatura HMAC-SHA256 válida e recente é aprovada")
    void shouldApproveValidSignature() throws Exception {
        String dataId = "123456789";
        String requestId = "req-abc-999";
        String ts = String.valueOf(Instant.now().getEpochSecond());
        String manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = "ts=" + ts + ",v1=" + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));

        assertThat(validator.verifyWebhookSignature(signature, requestId, dataId)).isTrue();
    }

    @Test
    @DisplayName("Rejeita assinatura com timestamp expirado (> 15 minutos)")
    void shouldRejectExpiredSignature() throws Exception {
        String dataId = "123456789";
        String requestId = "req-abc-999";
        String ts = String.valueOf(Instant.now().minusSeconds(1000).getEpochSecond()); // ~16.6 min atrás
        String manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";

        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = "ts=" + ts + ",v1=" + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));

        assertThat(validator.verifyWebhookSignature(signature, requestId, dataId)).isFalse();
    }

    @Test
    @DisplayName("Rejeita assinatura alterada ou adulterada (tampering)")
    void shouldRejectTamperedSignature() {
        String dataId = "123456789";
        String requestId = "req-abc-999";
        String ts = String.valueOf(Instant.now().getEpochSecond());
        String badSignature = "ts=" + ts + ",v1=00112233445566778899aabbccddeeff";

        assertThat(validator.verifyWebhookSignature(badSignature, requestId, dataId)).isFalse();
    }

    @Test
    @DisplayName("Rejeita se headers obrigatórios ou secret forem nulos/em branco")
    void shouldRejectWhenHeadersOrSecretMissing() {
        assertThat(validator.verifyWebhookSignature(null, "req-1", "data-1")).isFalse();
        assertThat(validator.verifyWebhookSignature("ts=1,v1=abc", null, "data-1")).isFalse();
        assertThat(validator.verifyWebhookSignature("ts=1,v1=abc", "req-1", null)).isFalse();

        properties.getMercadopago().setWebhookSecret(null);
        assertThat(validator.verifyWebhookSignature("ts=1,v1=abc", "req-1", "data-1")).isFalse();
    }
}
