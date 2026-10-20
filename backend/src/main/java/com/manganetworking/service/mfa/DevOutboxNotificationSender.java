package com.manganetworking.service.mfa;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile({"dev", "test", "local"})
@ConditionalOnProperty(name = "platform.mail.enabled", havingValue = "false")
public class DevOutboxNotificationSender implements MfaNotificationSender {

    private final DevOutboxRepository devOutboxRepository;

    public DevOutboxNotificationSender(DevOutboxRepository devOutboxRepository) {
        this.devOutboxRepository = devOutboxRepository;
    }

    @Override
    public void sendOtp(String destination, String otpCode, String purpose) {
        // Armazena na Dev Outbox isolada sem expor nos logs da aplicação
        devOutboxRepository.store(destination, otpCode, purpose);
    }

    @Override
    public void sendPasswordResetLink(String destination, String resetUrl, long expiresInMinutes) {
        devOutboxRepository.storePasswordResetLink(destination, resetUrl, expiresInMinutes);
    }
}
