package com.manganetworking.service;

import com.manganetworking.service.mfa.DevOutboxNotificationSender;
import com.manganetworking.service.mfa.DevOutboxRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class TwoFactorAuthServiceTest {

    private DevOutboxRepository devOutboxRepository;
    private TwoFactorAuthService twoFactorAuthService;

    @BeforeEach
    void setUp() {
        devOutboxRepository = new DevOutboxRepository();
        DevOutboxNotificationSender sender = new DevOutboxNotificationSender(devOutboxRepository);
        twoFactorAuthService = new TwoFactorAuthService(sender);
    }

    @Test
    void shouldGenerateOtpAndStoreInDevOutbox() {
        String email = "leitor@manganetworking.com";
        String otp = twoFactorAuthService.generateAndSendOtp(email, email);

        assertNotNull(otp);
        assertEquals(6, otp.length());

        Optional<DevOutboxRepository.DevOutboxMessage> latest = devOutboxRepository.findLatest(email);
        assertTrue(latest.isPresent());
        assertEquals(otp, latest.get().otpCode());
        assertEquals("AUTENTICACAO_2FA", latest.get().purpose());
    }

    @Test
    void shouldVerifyValidOtpAndInvalidateAfterSingleUse() {
        String email = "criador@manganetworking.com";
        String otp = twoFactorAuthService.generateAndSendOtp(email, email);

        // Verificação válida
        boolean valid = twoFactorAuthService.verifyOtp(email, otp);
        assertTrue(valid);

        // Uso único: não pode ser reutilizado
        boolean reused = twoFactorAuthService.verifyOtp(email, otp);
        assertFalse(reused);
    }

    @Test
    void shouldRejectInvalidOtpAndTrackAttempts() {
        String email = "user@test.com";
        twoFactorAuthService.generateAndSendOtp(email, email);

        boolean result = twoFactorAuthService.verifyOtp(email, "000000");
        assertFalse(result);
        assertEquals(1, twoFactorAuthService.getAttempts(email));
    }

    @Test
    void shouldLockoutAfterFiveFailedAttempts() {
        String email = "hacker@attack.com";
        twoFactorAuthService.generateAndSendOtp(email, email);

        // 4 tentativas incorretas
        for (int i = 0; i < 4; i++) {
            assertFalse(twoFactorAuthService.verifyOtp(email, "11111" + i));
        }

        // A 5ª tentativa falha atinge o limite
        assertThrows(SecurityException.class, () ->
                twoFactorAuthService.verifyOtp(email, "999999")
        );
    }
}
