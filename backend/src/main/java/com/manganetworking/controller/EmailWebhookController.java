package com.manganetworking.controller;

import com.manganetworking.service.email.EmailSuppressionService;
import com.manganetworking.service.email.dto.EmailDeliveryEventDto;
import com.manganetworking.util.EmailNormalizer;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Webhook de eventos de entrega de e-mail (item 46 do roadmap: monitorar bounces).
 * <p>
 * O provedor de e-mail chama esta rota quando uma mensagem sofre bounce ou complaint. A
 * autenticação é por segredo compartilhado no header {@code X-Email-Webhook-Secret},
 * comparado em tempo constante. Sem o segredo configurado, a rota recusa tudo.
 * </p>
 */
@RestController
@RequestMapping("/api/webhooks/email")
public class EmailWebhookController {

    private static final String SECRET_HEADER = "X-Email-Webhook-Secret";

    private final EmailSuppressionService suppressionService;
    private final String webhookSecret;

    public EmailWebhookController(
            EmailSuppressionService suppressionService,
            @Value("${spring.mail.webhook-secret:}") String webhookSecret
    ) {
        this.suppressionService = suppressionService;
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
    }

    @PostMapping("/delivery-events")
    public ResponseEntity<Map<String, String>> recordDeliveryEvent(
            @RequestHeader(value = SECRET_HEADER, required = false) String providedSecret,
            @Valid @RequestBody EmailDeliveryEventDto event
    ) {
        if (webhookSecret.isBlank() || providedSecret == null
                || !MessageDigest.isEqual(
                        providedSecret.getBytes(StandardCharsets.UTF_8),
                        webhookSecret.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Webhook de e-mail não autorizado."));
        }

        // O endereço do evento é canonicalizado (trim + minúsculas) antes de virar hash:
        // o mesmo endereço com caixa diferente precisa cair na mesma lista de supressão.
        String normalizedEmail;
        try {
            normalizedEmail = EmailNormalizer.normalize(event.email());
        } catch (IllegalArgumentException invalid) {
            return ResponseEntity.badRequest().body(Map.of("message", "E-mail do evento inválido."));
        }

        suppressionService.record(normalizedEmail, event.eventType(), event.reason(), event.provider(), event.occurredAt());
        return ResponseEntity.ok(Map.of("status", "RECORDED"));
    }
}
