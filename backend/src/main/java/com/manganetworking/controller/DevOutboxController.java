package com.manganetworking.controller;

import com.manganetworking.service.mfa.DevOutboxRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dev/outbox")
@Profile("!prod")
public class DevOutboxController {

    private final DevOutboxRepository devOutboxRepository;

    public DevOutboxController(DevOutboxRepository devOutboxRepository) {
        this.devOutboxRepository = devOutboxRepository;
    }

    /**
     * Endpoint local para testes de desenvolvimento: recupera o último código 2FA emitido
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestOtp(@RequestParam String email) {
        return devOutboxRepository.findLatest(email)
                .map(msg -> ResponseEntity.ok(Map.of(
                        "destination", msg.destination(),
                        "otpCode", msg.otpCode(),
                        "purpose", msg.purpose(),
                        "sentAt", msg.sentAt()
                )))
                .orElse(ResponseEntity.notFound().build());
    }
}
