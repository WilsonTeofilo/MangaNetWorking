package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MercadoPagoServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private MonetizationService monetizationService;

    private PlatformProperties properties;
    private MercadoPagoService mercadoPagoService;

    @BeforeEach
    void setUp() {
        properties = new PlatformProperties();
        mercadoPagoService = new MercadoPagoService(properties, userRepository, monetizationService);
    }

    @Test
    @DisplayName("Deve falhar ao criar checkout se ACCESS_TOKEN não estiver configurado")
    void shouldFailIfAccessTokenMissing() {
        properties.getMercadopago().setAccessToken(null);
        UUID userId = UUID.randomUUID();

        assertThatThrownBy(() -> mercadoPagoService.createVipCheckoutPreference(userId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("MERCADOPAGO_ACCESS_TOKEN");
    }

    @Test
    @DisplayName("Deve validar corretamente assinatura HMAC-SHA256 do webhook do Mercado Pago")
    void shouldValidateHmacSha256WebhookSignature() throws Exception {
        String secret = "test_webhook_secret_key_123456";
        properties.getMercadopago().setWebhookSecret(secret);

        String dataId = "123456789";
        String requestId = "req-abc-999";
        String ts = "1729350000";

        // Cria o hash HMAC esperado
        String manifest = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hmacBytes = mac.doFinal(manifest.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        String expectedHex = java.util.HexFormat.of().formatHex(hmacBytes);

        String signatureHeader = "ts=" + ts + ",v1=" + expectedHex;

        boolean isValid = mercadoPagoService.verifyWebhookSignature(signatureHeader, requestId, dataId);
        assertThat(isValid).isTrue();
    }

    @Test
    @DisplayName("Deve rejeitar assinatura inválida ou adulterada")
    void shouldRejectTamperedSignature() {
        properties.getMercadopago().setWebhookSecret("test_webhook_secret_key_123456");

        String signatureHeader = "ts=1729350000,v1=adulterated_hash_value_xyz";
        boolean isValid = mercadoPagoService.verifyWebhookSignature(signatureHeader, "req-1", "999");

        assertThat(isValid).isFalse();
    }
}
