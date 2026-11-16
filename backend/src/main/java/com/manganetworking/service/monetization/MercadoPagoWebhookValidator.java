package com.manganetworking.service.monetization;

import com.manganetworking.config.observability.PaymentObservabilityMetrics;
import com.manganetworking.config.properties.PlatformProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Validador criptográfico de webhooks do Mercado Pago.
 *
 * <p>Implementa validação estrita de assinatura HMAC-SHA256 conforme a especificação oficial:
 * {@code id:<data.id>;request-id:<x-request-id>;ts:<ts>;}.
 * Protegido contra replay attacks via janela de tolerância temporal e timing attacks
 * via comparação em tempo constante ({@link MessageDigest#isEqual}).</p>
 */
@Component
public class MercadoPagoWebhookValidator {

    private static final Duration WEBHOOK_SIGNATURE_MAX_AGE = Duration.ofMinutes(15);

    private final PlatformProperties properties;
    private final PaymentObservabilityMetrics metrics;

    @Autowired
    public MercadoPagoWebhookValidator(PlatformProperties properties, PaymentObservabilityMetrics metrics) {
        this.properties = properties;
        this.metrics = metrics;
    }

    public MercadoPagoWebhookValidator(PlatformProperties properties) {
        this(properties, null);
    }

    /**
     * Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago.
     *
     * @param signatureHeader cabeçalho {@code x-signature} contendo {@code ts} e {@code v1}
     * @param requestIdHeader cabeçalho {@code x-request-id}
     * @param dataId          identificador do recurso no payload ({@code data.id})
     * @return {@code true} se a assinatura for válida e dentro da janela de tolerância; {@code false} caso contrário
     */
    public boolean verifyWebhookSignature(String signatureHeader, String requestIdHeader, String dataId) {
        String secret = properties.getMercadopago().getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            recordMetric("missing_secret");
            return false;
        }
        if (signatureHeader == null || requestIdHeader == null || dataId == null) {
            recordMetric("malformed_headers");
            return false;
        }

        String timestamp = null;
        String signature = null;
        for (String part : signatureHeader.split(",")) {
            String[] keyValue = part.split("=", 2);
            if (keyValue.length != 2) {
                continue;
            }
            String key = keyValue[0].trim();
            if ("ts".equalsIgnoreCase(key)) {
                timestamp = keyValue[1].trim();
            }
            if ("v1".equalsIgnoreCase(key)) {
                signature = keyValue[1].trim();
            }
        }

        if (timestamp == null || signature == null || !timestamp.matches("[0-9]{1,12}")) {
            recordMetric("malformed_headers");
            return false;
        }

        try {
            long timestampSeconds = Long.parseLong(timestamp);
            if (Math.abs(Instant.now().getEpochSecond() - timestampSeconds) > WEBHOOK_SIGNATURE_MAX_AGE.toSeconds()) {
                recordMetric("expired_replay");
                return false;
            }

            String manifest = "id:" + dataId.trim().toLowerCase(Locale.ROOT)
                    + ";request-id:" + requestIdHeader.trim() + ";ts:" + timestamp + ";";

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            byte[] actual = HexFormat.of().parseHex(signature);

            boolean valid = MessageDigest.isEqual(expected, actual);
            recordMetric(valid ? "valid" : "invalid_signature");
            return valid;
        } catch (Exception exception) {
            recordMetric("invalid_signature");
            return false;
        }
    }

    private void recordMetric(String outcome) {
        if (metrics != null) {
            metrics.recordWebhookVerification(outcome);
        }
    }
}
