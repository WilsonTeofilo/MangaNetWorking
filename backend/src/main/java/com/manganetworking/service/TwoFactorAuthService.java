package com.manganetworking.service;

import com.manganetworking.service.mfa.MfaNotificationSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TwoFactorAuthService {

    private static final long OTP_TTL_SECONDS = 300; // 5 minutos de validade

    private final SecureRandom secureRandom = new SecureRandom();
    private final MfaNotificationSender mfaNotificationSender;

    // Cache thread-safe de códigos OTP em memória
    private final Map<String, OtpEntry> otpCache = new ConcurrentHashMap<>();

    public TwoFactorAuthService(MfaNotificationSender mfaNotificationSender) {
        this.mfaNotificationSender = mfaNotificationSender;
    }

    /**
     * Gera e envia código 2FA de 6 dígitos via canal isolado (Dev Outbox)
     */
    public String generateAndSendOtp(String userIdentifier, String destination) {
        int number = secureRandom.nextInt(900000) + 100000;
        String otpCode = String.valueOf(number);

        Instant expiresAt = Instant.now().plusSeconds(OTP_TTL_SECONDS);
        otpCache.put(userIdentifier.trim().toLowerCase(), new OtpEntry(otpCode, expiresAt, 0));

        // Envia para a caixa de saída (Dev Outbox em desenvolvimento local)
        mfaNotificationSender.sendOtp(destination, otpCode, "AUTENTICACAO_2FA");

        return otpCode;
    }

    /**
     * Valida o código 2FA no servidor com proteção anti-força bruta (máx 5 tentativas)
     */
    public boolean verifyOtp(String userIdentifier, String codeProvided) {
        String key = userIdentifier.trim().toLowerCase();
        OtpEntry entry = otpCache.get(key);
        if (entry == null) {
            return false;
        }

        if (Instant.now().isAfter(entry.expiresAt())) {
            otpCache.remove(key);
            return false;
        }

        if (entry.attempts() >= 5) {
            otpCache.remove(key);
            throw new SecurityException("Muitas tentativas incorretas. Código 2FA cancelado por proteção anti-força bruta.");
        }

        boolean isValid = entry.code().equals(codeProvided.trim());
        if (isValid) {
            otpCache.remove(key); // Uso único: destrói o código imediatamente
            return true;
        } else {
            int newAttempts = entry.attempts() + 1;
            if (newAttempts >= 5) {
                otpCache.remove(key);
                throw new SecurityException("Muitas tentativas incorretas. Código 2FA cancelado por proteção anti-força bruta.");
            }
            otpCache.put(key, new OtpEntry(entry.code(), entry.expiresAt(), newAttempts));
            return false;
        }
    }

    public int getAttempts(String userIdentifier) {
        OtpEntry entry = otpCache.get(userIdentifier.trim().toLowerCase());
        return entry != null ? entry.attempts() : 0;
    }

    private record OtpEntry(String code, Instant expiresAt, int attempts) {}
}
