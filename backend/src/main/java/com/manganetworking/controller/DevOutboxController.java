package com.manganetworking.controller;

import com.manganetworking.service.mfa.DevOutboxRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/dev/outbox")
@Profile({"dev", "test", "local"})
public class DevOutboxController {

    private static final Logger log = LoggerFactory.getLogger(DevOutboxController.class);

    private final DevOutboxRepository devOutboxRepository;

    public DevOutboxController(DevOutboxRepository devOutboxRepository) {
        this.devOutboxRepository = devOutboxRepository;
    }

    /**
     * Aviso explícito no boot: este endpoint devolve o código 2FA sem autenticação.
     * <p>
     * O bean só é criado sob profile explícito {@code dev}, {@code test} ou
     * {@code local} (fail-closed). Sem profile ativo (ou com {@code prod}) o
     * endpoint simplesmente não existe, então esquecer de configurar
     * {@code SPRING_PROFILES_ACTIVE} não expõe bypass de 2FA.
     */
    @jakarta.annotation.PostConstruct
    void warnIfExposed() {
        log.warn("[DEV OUTBOX] Endpoint de desenvolvimento habilitado (profile dev/test/local): "
                + "/api/dev/outbox/latest e /password-reset/latest devolvem segredos sem autenticação. "
                + "NUNCA exponha isto publicamente.");
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

    @GetMapping("/password-reset/latest")
    public ResponseEntity<?> getLatestPasswordReset(@RequestParam String email) {
        return devOutboxRepository.findLatestPasswordReset(email)
                .map(message -> ResponseEntity.ok(Map.of(
                        "destination", message.destination(),
                        "resetUrl", message.resetUrl(),
                        "sentAt", message.sentAt(),
                        "expiresAt", message.expiresAt()
                )))
                .orElse(ResponseEntity.notFound().build());
    }
}
