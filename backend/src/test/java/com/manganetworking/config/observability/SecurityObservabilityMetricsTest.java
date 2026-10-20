package com.manganetworking.config.observability;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityObservabilityMetricsTest {

    @Test
    void recordsOtpAndEmailEventsUsingLowCardinalityTags() {
        SimpleMeterRegistry registry = new SimpleMeterRegistry();
        SecurityObservabilityMetrics metrics = new SecurityObservabilityMetrics(registry);

        metrics.recordOtpIssued("LOGIN");
        metrics.recordOtpVerification("invalid");
        metrics.recordEmailDelivery("failed");

        assertThat(registry.get("manganetworking.security.otp.issued").tag("purpose", "LOGIN").counter().count())
                .isEqualTo(1);
        assertThat(registry.get("manganetworking.security.otp.verification").tag("outcome", "invalid").counter().count())
                .isEqualTo(1);
        assertThat(registry.get("manganetworking.security.email.delivery").tag("outcome", "failed").counter().count())
                .isEqualTo(1);
    }
}
