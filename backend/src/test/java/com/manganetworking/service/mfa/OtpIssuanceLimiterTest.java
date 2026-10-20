package com.manganetworking.service.mfa;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class OtpIssuanceLimiterTest {

    @Test
    void enforcesSixtySecondCooldownAndThreeIssuancesPerTenMinutes() {
        OtpIssuanceLimiter limiter = new OtpIssuanceLimiter(null, "inmemory");
        Instant start = Instant.parse("2026-10-19T12:00:00Z");

        assertTrue(limiter.tryAcquire("user@example.com", "192.0.2.10", start));
        assertFalse(limiter.tryAcquire("user@example.com", "192.0.2.10", start.plusSeconds(59)));
        assertTrue(limiter.tryAcquire("user@example.com", "192.0.2.10", start.plusSeconds(60)));
        assertTrue(limiter.tryAcquire("user@example.com", "192.0.2.10", start.plusSeconds(120)));
        assertFalse(limiter.tryAcquire("user@example.com", "192.0.2.10", start.plusSeconds(180)));
        assertTrue(limiter.tryAcquire("user@example.com", "192.0.2.10", start.plusSeconds(600)));
    }

    @Test
    void passwordResetNamespaceDoesNotConsumeOtpQuota() {
        OtpIssuanceLimiter limiter = new OtpIssuanceLimiter(null, "inmemory");
        Instant start = Instant.parse("2026-10-19T12:00:00Z");

        assertTrue(limiter.tryAcquire(OtpIssuanceLimiter.PASSWORD_RESET_NAMESPACE,
                "user@example.com", "192.0.2.10", start));
        assertTrue(limiter.tryAcquire(OtpIssuanceLimiter.OTP_NAMESPACE,
                "user@example.com", "192.0.2.10", start));
        assertFalse(limiter.tryAcquire(OtpIssuanceLimiter.PASSWORD_RESET_NAMESPACE,
                "user@example.com", "192.0.2.10", start.plusSeconds(59)));
        assertTrue(limiter.tryAcquire(OtpIssuanceLimiter.OTP_NAMESPACE,
                "user@example.com", "192.0.2.10", start.plusSeconds(60)));
    }

    @Test
    void accountAndIpLimitsAreIndependentAndAtomic() {
        OtpIssuanceLimiter limiter = new OtpIssuanceLimiter(null, "inmemory");
        Instant start = Instant.parse("2026-10-19T12:00:00Z");

        assertTrue(limiter.tryAcquire("one@example.com", "192.0.2.10", start));
        assertTrue(limiter.tryAcquire("two@example.com", "192.0.2.10", start.plusSeconds(60)));
        assertTrue(limiter.tryAcquire("three@example.com", "192.0.2.10", start.plusSeconds(120)));
        assertFalse(limiter.tryAcquire("four@example.com", "192.0.2.10", start.plusSeconds(180)));
        assertTrue(limiter.tryAcquire("four@example.com", "192.0.2.11", start.plusSeconds(180)));
    }
}
