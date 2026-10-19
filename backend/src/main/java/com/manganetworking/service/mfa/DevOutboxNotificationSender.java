package com.manganetworking.service.mfa;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "platform.mail.enabled", havingValue = "false", matchIfMissing = true)
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
}
