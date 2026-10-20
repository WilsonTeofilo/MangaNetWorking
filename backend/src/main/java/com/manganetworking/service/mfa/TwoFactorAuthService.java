package com.manganetworking.service.mfa;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.manganetworking.config.observability.SecurityObservabilityMetrics;
import com.manganetworking.util.EmailNormalizer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Geração e validação de códigos 2FA (OTP) via store substituível e proteção anti-força bruta.
 */
@Service
public class TwoFactorAuthService {

    private static final long OTP_TTL_SECONDS = 300; // 5 minutos de validade
    private static final int OTP_MIN = 100_000;
    private static final int OTP_RANGE = 900_000;

    private final SecureRandom secureRandom = new SecureRandom();
    private final MfaNotificationSender mfaNotificationSender;
    private final SecretKeySpec hmacKey;

    private final OtpChallengeStore challengeStore;
    private final SecurityObservabilityMetrics metrics;

    @Autowired
    public TwoFactorAuthService(
            MfaNotificationSender mfaNotificationSender,
            OtpChallengeStore challengeStore,
            SecurityObservabilityMetrics metrics,
            @Value("${platform.security.otp-hmac-secret}") String hmacSecret
    ) {
        if (hmacSecret == null || hmacSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("platform.security.otp-hmac-secret deve ter ao menos 32 bytes.");
        }
        this.mfaNotificationSender = mfaNotificationSender;
        this.challengeStore = challengeStore;
        this.metrics = metrics;
        this.hmacKey = new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    /** Compatibility constructor for isolated unit tests using the local adapter. */
    public TwoFactorAuthService(MfaNotificationSender mfaNotificationSender, String hmacSecret) {
        this(mfaNotificationSender, new InMemoryOtpChallengeStore(),
                new SecurityObservabilityMetrics(new SimpleMeterRegistry()), hmacSecret);
    }

    /**
     * Gera e envia código 2FA de 6 dígitos via canal isolado (Dev Outbox)
     */
    public String generateAndSendOtp(String userIdentifier, String destination, OtpPurpose purpose) {
        int number = secureRandom.nextInt(OTP_RANGE) + OTP_MIN;
        String otpCode = String.valueOf(number);

        Instant expiresAt = Instant.now().plusSeconds(OTP_TTL_SECONDS);
        String normalizedIdentifier = normalizeIdentifier(userIdentifier);
        String codeHmac = hashOtp(normalizedIdentifier, purpose, otpCode);
        Runnable deliverAndActivate = () -> {
            mfaNotificationSender.sendOtp(destination, otpCode, purpose.notificationPurpose());
            // Só torna o desafio verificável depois que o adaptador confirmou a entrega.
            challengeStore.save(normalizedIdentifier, codeHmac, purpose.name(), expiresAt.toEpochMilli());
            metrics.recordOtpIssued(purpose.name());
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    deliverAndActivate.run();
                }
            });
        } else {
            deliverAndActivate.run();
        }

        return otpCode;
    }

    /**
     * Valida o código 2FA no servidor com proteção anti-força bruta (máx 5 tentativas)
     */
    public boolean verifyOtp(String userIdentifier, String codeProvided, OtpPurpose expectedPurpose) {
        return verifyOtp(userIdentifier, codeProvided, expectedPurpose, Instant.now());
    }

    boolean verifyOtp(String userIdentifier, String codeProvided, OtpPurpose expectedPurpose, Instant now) {
        String key = normalizeIdentifier(userIdentifier);
        String candidateHmac = hashOtp(key, expectedPurpose, codeProvided == null ? "" : codeProvided.trim());
        OtpChallengeStore.VerificationResult result = challengeStore.verify(
                key, candidateHmac, expectedPurpose.name(), now.toEpochMilli());
        String outcome = switch (result) {
            case VALID -> "valid";
            case INVALID -> "invalid";
            case MISSING_OR_EXPIRED -> "expired_or_missing";
            case LOCKED -> "locked";
        };
        metrics.recordOtpVerification(outcome);
        if (result == OtpChallengeStore.VerificationResult.LOCKED) {
            throw new SecurityException("Muitas tentativas incorretas. Código 2FA cancelado por proteção anti-força bruta.");
        }
        return result == OtpChallengeStore.VerificationResult.VALID;
    }

    public int getAttempts(String userIdentifier) {
        return challengeStore.attempts(normalizeIdentifier(userIdentifier));
    }

    public void invalidateChallenge(String userIdentifier) {
        challengeStore.invalidate(normalizeIdentifier(userIdentifier));
    }

    private String hashOtp(String identifier, OtpPurpose purpose, String code) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(hmacKey);
            byte[] digest = mac.doFinal(("MangaNetWorking:2FA:v1:" + identifier + ":" + purpose.name() + ":" + code)
                    .getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HMAC de OTP indisponível.", exception);
        }
    }

    private String normalizeIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new IllegalArgumentException("Identificador de usuário obrigatório.");
        }
        // O identificador é o e-mail do titular: canonicaliza (trim + minúsculas) para que
        // o OTP seja sempre gerado e verificado sob a mesma chave. Dados legados fora do
        // padrão continuam funcionando com a normalização simples anterior.
        return EmailNormalizer.isValid(identifier)
                ? EmailNormalizer.normalize(identifier)
                : identifier.trim().toLowerCase(Locale.ROOT);
    }

    public enum OtpPurpose {
        LOGIN("AUTENTICACAO_2FA"),
        STEP_UP_PIX("STEP_UP_PIX");

        private final String notificationPurpose;

        OtpPurpose(String notificationPurpose) {
            this.notificationPurpose = notificationPurpose;
        }

        String notificationPurpose() {
            return notificationPurpose;
        }
    }

}
