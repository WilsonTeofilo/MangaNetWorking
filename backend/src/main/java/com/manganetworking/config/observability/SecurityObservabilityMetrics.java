package com.manganetworking.config.observability;

import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.stereotype.Component;

/** Low-cardinality security and mail counters intended for Prometheus alert rules. */
@Component
public class SecurityObservabilityMetrics {

    private final MeterRegistry registry;

    public SecurityObservabilityMetrics(MeterRegistry registry) {
        this.registry = registry;
    }

    public void recordOtpIssued(String purpose) {
        registry.counter("manganetworking.security.otp.issued", "purpose", purpose).increment();
    }

    public void recordOtpVerification(String outcome) {
        registry.counter("manganetworking.security.otp.verification", "outcome", outcome).increment();
    }

    public void recordEmailDelivery(String outcome) {
        registry.counter("manganetworking.security.email.delivery", "outcome", outcome).increment();
    }
}
