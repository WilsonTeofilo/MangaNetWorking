package com.manganetworking.service.mfa;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DevOutboxRepository {

    // Guarda mensagens de 2FA em memória durante desenvolvimento local sem logar no console
    private final Map<String, DevOutboxMessage> messages = new ConcurrentHashMap<>();

    public void store(String destination, String otpCode, String purpose) {
        messages.put(destination.trim().toLowerCase(), new DevOutboxMessage(destination, otpCode, purpose, Instant.now()));
    }

    public Optional<DevOutboxMessage> findLatest(String destination) {
        return Optional.ofNullable(messages.get(destination.trim().toLowerCase()));
    }

    public void clear(String destination) {
        messages.remove(destination.trim().toLowerCase());
    }

    public record DevOutboxMessage(String destination, String otpCode, String purpose, Instant sentAt) {}
}
