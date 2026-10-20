package com.manganetworking.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

class UnicodeAwarePasswordEncoderTest {

    private final UnicodeAwarePasswordEncoder encoder = new UnicodeAwarePasswordEncoder(4);

    @Test
    void hashesFullUnicodeInputWithoutBcryptByteTruncation() {
        String first = "a".repeat(63) + "猫";
        String second = "a".repeat(63) + "犬";
        String encoded = encoder.encode(first);

        assertTrue(encoder.matches(first, encoded));
        assertFalse(encoder.matches(second, encoded));
        assertFalse(encoder.upgradeEncoding(encoded));
    }

    @Test
    void matchesLegacyBcryptAndRequestsUpgradeOnSuccessfulLogin() {
        String legacy = new BCryptPasswordEncoder(4).encode("senha legada");

        assertTrue(encoder.matches("senha legada", legacy));
        assertTrue(encoder.upgradeEncoding(legacy));
    }
}
