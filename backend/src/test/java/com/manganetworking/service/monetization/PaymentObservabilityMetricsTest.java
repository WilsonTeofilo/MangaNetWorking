package com.manganetworking.service.monetization;

import com.manganetworking.config.observability.PaymentObservabilityMetrics;
import com.manganetworking.config.properties.PlatformProperties;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PaymentObservabilityMetricsTest {

    private SimpleMeterRegistry meterRegistry;
    private PaymentObservabilityMetrics metrics;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        metrics = new PaymentObservabilityMetrics(meterRegistry);
    }

    @Test
    void shouldIncrementWebhookVerificationCounters() {
        metrics.recordWebhookVerification("valid");
        metrics.recordWebhookVerification("expired_replay");

        assertEquals(1.0, meterRegistry.get("manganetworking.payment.webhook.verification")
                .tag("outcome", "valid").counter().count());
        assertEquals(1.0, meterRegistry.get("manganetworking.payment.webhook.verification")
                .tag("outcome", "expired_replay").counter().count());
    }

    @Test
    void shouldIncrementPaymentStatusAndReconciliation() {
        metrics.recordPaymentStatus("vip", "approved");
        metrics.recordReconciliation("vip", "success");

        assertEquals(1.0, meterRegistry.get("manganetworking.payment.status")
                .tag("type", "vip").tag("status", "approved").counter().count());
        assertEquals(1.0, meterRegistry.get("manganetworking.payment.reconciliation")
                .tag("type", "vip").tag("outcome", "success").counter().count());
    }

    @Test
    void shouldTrackWebhookValidatorMetricsOnReplayAndInvalidSignature() {
        PlatformProperties props = new PlatformProperties();
        props.getMercadopago().setWebhookSecret("test-secret-key");

        MercadoPagoWebhookValidator validator = new MercadoPagoWebhookValidator(props, metrics);

        // Assinatura inválida
        boolean valid = validator.verifyWebhookSignature("ts=1700000000,v1=bad_hash", "req-1", "data-1");
        assertFalse(valid);

        // Cabeçalhos malformados
        boolean malformed = validator.verifyWebhookSignature(null, null, null);
        assertFalse(malformed);
        assertEquals(1.0, meterRegistry.get("manganetworking.payment.webhook.verification")
                .tag("outcome", "malformed_headers").counter().count());
    }
}
