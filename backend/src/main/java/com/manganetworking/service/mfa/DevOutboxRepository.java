package com.manganetworking.service.mfa;

import org.springframework.stereotype.Component;

import com.manganetworking.util.EmailNormalizer;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DevOutboxRepository {

    // Guarda mensagens de 2FA em memória durante desenvolvimento local sem logar no console
    private final Map<String, DevOutboxMessage> messages = new ConcurrentHashMap<>();
    private final Map<String, DevOutboxPasswordResetMessage> passwordResetMessages = new ConcurrentHashMap<>();

    public void store(String destination, String otpCode, String purpose) {
        messages.put(normalize(destination), new DevOutboxMessage(destination, otpCode, purpose, Instant.now()));
    }

    public Optional<DevOutboxMessage> findLatest(String destination) {
        return Optional.ofNullable(messages.get(normalize(destination)));
    }

    public void clear(String destination) {
        messages.remove(normalize(destination));
    }

    public void storePasswordResetLink(String destination, String resetUrl, long expiresInMinutes) {
        Instant sentAt = Instant.now();
        passwordResetMessages.put(normalize(destination),
                new DevOutboxPasswordResetMessage(destination, resetUrl, sentAt, sentAt.plusSeconds(expiresInMinutes * 60)));
    }

    public Optional<DevOutboxPasswordResetMessage> findLatestPasswordReset(String destination) {
        String key = normalize(destination);
        DevOutboxPasswordResetMessage message = passwordResetMessages.get(key);
        if (message == null) return Optional.empty();
        if (!message.expiresAt().isAfter(Instant.now())) {
            passwordResetMessages.remove(key, message);
            return Optional.empty();
        }
        return Optional.of(message);
    }

    private String normalize(String destination) {
        try {
            return EmailNormalizer.normalize(destination);
        } catch (IllegalArgumentException invalid) {
            return destination.trim().toLowerCase(Locale.ROOT);
        }
    }

    public record DevOutboxMessage(String destination, String otpCode, String purpose, Instant sentAt) {}
    public record DevOutboxPasswordResetMessage(String destination, String resetUrl, Instant sentAt, Instant expiresAt) {}
}
