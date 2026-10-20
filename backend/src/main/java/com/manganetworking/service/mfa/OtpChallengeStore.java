package com.manganetworking.service.mfa;

/** Port for short-lived, single-use MFA challenges. */
public interface OtpChallengeStore {

    void save(String identifier, String codeHmac, String purpose, long expiresAtEpochMillis);

    VerificationResult verify(String identifier, String candidateHmac, String expectedPurpose, long nowEpochMillis);

    int attempts(String identifier);

    void invalidate(String identifier);

    enum VerificationResult {
        VALID, INVALID, MISSING_OR_EXPIRED, LOCKED
    }
}
