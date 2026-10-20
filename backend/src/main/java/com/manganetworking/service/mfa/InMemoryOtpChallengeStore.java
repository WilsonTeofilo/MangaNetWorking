package com.manganetworking.service.mfa;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

/** Process-local adapter for development and tests only. */
@Component
@ConditionalOnProperty(name = "platform.otp.store", havingValue = "inmemory", matchIfMissing = true)
public class InMemoryOtpChallengeStore implements OtpChallengeStore {

    private static final int MAX_ATTEMPTS = 5;
    private final Map<String, Challenge> challenges = new ConcurrentHashMap<>();

    @Override
    public void save(String identifier, String codeHmac, String purpose, long expiresAtEpochMillis) {
        challenges.put(identifier, new Challenge(codeHmac, purpose, expiresAtEpochMillis, 0));
    }

    @Override
    public VerificationResult verify(String identifier, String candidateHmac, String expectedPurpose, long now) {
        final VerificationResult[] result = {VerificationResult.MISSING_OR_EXPIRED};
        challenges.computeIfPresent(identifier, (key, challenge) -> {
            if (now >= challenge.expiresAtEpochMillis()) return null;
            if (challenge.attempts() >= MAX_ATTEMPTS) {
                result[0] = VerificationResult.LOCKED;
                return null;
            }
            if (challenge.purpose().equals(expectedPurpose) && MessageDigest.isEqual(
                    challenge.codeHmac().getBytes(StandardCharsets.US_ASCII),
                    candidateHmac.getBytes(StandardCharsets.US_ASCII))) {
                result[0] = VerificationResult.VALID;
                return null;
            }
            result[0] = VerificationResult.INVALID;
            return new Challenge(challenge.codeHmac(), challenge.purpose(), challenge.expiresAtEpochMillis(), challenge.attempts() + 1);
        });
        return result[0];
    }

    @Override
    public int attempts(String identifier) {
        Challenge challenge = challenges.get(identifier);
        return challenge == null ? 0 : challenge.attempts();
    }

    @Override
    public void invalidate(String identifier) {
        challenges.remove(identifier);
    }

    private record Challenge(String codeHmac, String purpose, long expiresAtEpochMillis, int attempts) {}
}
