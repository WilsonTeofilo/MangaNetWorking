package com.manganetworking.service.mfa;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class TwoFactorAuthServiceTest {

    private DevOutboxRepository devOutboxRepository;
    private TwoFactorAuthService twoFactorAuthService;

    @BeforeEach
    void setUp() {
        devOutboxRepository = new DevOutboxRepository();
        DevOutboxNotificationSender sender = new DevOutboxNotificationSender(devOutboxRepository);
        twoFactorAuthService = new TwoFactorAuthService(sender, "teste-seguro-hmac-otp-com-mais-de-32-bytes");
    }

    @Test
    void shouldGenerateOtpAndStoreInDevOutbox() {
        String email = "leitor@manganetworking.com";
        String otp = twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);

        assertNotNull(otp);
        assertEquals(6, otp.length());

        Optional<DevOutboxRepository.DevOutboxMessage> latest = devOutboxRepository.findLatest(email);
        assertTrue(latest.isPresent());
        assertEquals(otp, latest.get().otpCode());
        assertEquals("AUTENTICACAO_2FA", latest.get().purpose());
    }

    @Test
    void passwordResetLinkIsAvailableOnlyUntilItsConfiguredExpiryInDevOutbox() {
        String email = "reader@manganetworking.com";
        String link = "http://localhost:5180/reset-password#token=opaque-token";
        DevOutboxNotificationSender sender = new DevOutboxNotificationSender(devOutboxRepository);

        sender.sendPasswordResetLink(email, link, 30);

        Optional<DevOutboxRepository.DevOutboxPasswordResetMessage> message = devOutboxRepository.findLatestPasswordReset(email);
        assertTrue(message.isPresent());
        assertEquals(link, message.get().resetUrl());
        assertTrue(message.get().expiresAt().isAfter(message.get().sentAt()));
    }

    @Test
    void shouldVerifyValidOtpAndInvalidateAfterSingleUse() {
        String email = "criador@manganetworking.com";
        String otp = twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);

        // Verificação válida
        boolean valid = twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN);
        assertTrue(valid);

        // Uso único: não pode ser reutilizado
        boolean reused = twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN);
        assertFalse(reused);
    }

    @Test
    void shouldRejectInvalidOtpAndTrackAttempts() {
        String email = "user@test.com";
        twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);

        boolean result = twoFactorAuthService.verifyOtp(email, "000000", TwoFactorAuthService.OtpPurpose.LOGIN);
        assertFalse(result);
        assertEquals(1, twoFactorAuthService.getAttempts(email));
    }

    @Test
    void shouldAllowFiveFailuresAndRejectTheSixthAttempt() {
        String email = "hacker@attack.com";
        twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);

        // As cinco primeiras falhas são contabilizadas; a sexta é bloqueada.
        for (int i = 0; i < 5; i++) {
            assertFalse(twoFactorAuthService.verifyOtp(email, "11111" + i, TwoFactorAuthService.OtpPurpose.LOGIN));
        }

        assertThrows(SecurityException.class, () ->
                twoFactorAuthService.verifyOtp(email, "999999", TwoFactorAuthService.OtpPurpose.LOGIN)
        );
    }

    @Test
    void shouldRejectOtpWhenPurposeDoesNotMatchWithoutConsumingIt() {
        String email = "criador@manganetworking.com";
        String otp = twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);

        assertFalse(twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.STEP_UP_PIX));
        assertTrue(twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN));
    }

    @Test
    void expiredOtpIsRejectedAndRemoved() {
        String email = "expirado@manganetworking.com";
        String otp = twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);

        assertFalse(twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN,
                Instant.now().plusSeconds(301)));
        assertFalse(twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN));
    }

    @Test
    void otpIsNotDeliveredOrVerifiableUntilTransactionCommits() {
        String email = "after-commit@manganetworking.com";
        org.springframework.transaction.support.TransactionSynchronizationManager.initSynchronization();
        org.springframework.transaction.support.TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            String otp = twoFactorAuthService.generateAndSendOtp(email, email, TwoFactorAuthService.OtpPurpose.LOGIN);
            assertTrue(devOutboxRepository.findLatest(email).isEmpty());
            assertFalse(twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN));

            org.springframework.transaction.support.TransactionSynchronizationManager.getSynchronizations()
                    .forEach(org.springframework.transaction.support.TransactionSynchronization::afterCommit);

            assertTrue(devOutboxRepository.findLatest(email).isPresent());
            assertTrue(twoFactorAuthService.verifyOtp(email, otp, TwoFactorAuthService.OtpPurpose.LOGIN));
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.clearSynchronization();
            org.springframework.transaction.support.TransactionSynchronizationManager.setActualTransactionActive(false);
        }
    }
}
