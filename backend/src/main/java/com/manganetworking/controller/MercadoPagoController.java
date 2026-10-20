package com.manganetworking.controller;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.service.auth.AuthApplicationService;
import com.manganetworking.service.monetization.MercadoPagoService;
import com.manganetworking.service.session.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/monetization/mercadopago")
public class MercadoPagoController {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoController.class);
    private final MercadoPagoService mercadoPagoService;
    private final AuthApplicationService authService;

    public MercadoPagoController(MercadoPagoService mercadoPagoService, AuthApplicationService authService) {
        this.mercadoPagoService = mercadoPagoService;
        this.authService = authService;
    }

    @PostMapping("/vip/checkout")
    public ResponseEntity<Map<String, Object>> createVipCheckout(HttpServletRequest request) {
        SessionService.UserSession session = authService.getCurrentSession(request)
                .orElseThrow(() -> new AccessDeniedException("Autenticação necessária para assinar o plano VIP."));
        String checkoutUrl = mercadoPagoService.createVipCheckoutPreference(session.userId());
        return ResponseEntity.ok(Map.of("checkoutUrl", checkoutUrl, "priceBrl", mercadoPagoService.getVipPrice()));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestHeader(value = "x-signature", required = false) String signature,
            @RequestHeader(value = "x-request-id", required = false) String requestId,
            @RequestParam(value = "data.id", required = false) String dataIdParam,
            @RequestParam(value = "type", required = false) String type,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        String dataId = dataIdParam;
        if (dataId == null && payload != null && payload.get("data") instanceof Map<?, ?> data
                && data.get("id") != null) {
            dataId = String.valueOf(data.get("id"));
        }
        if (type != null && !"payment".equalsIgnoreCase(type)) return ResponseEntity.ok().build();
        if (dataId == null || signature == null || requestId == null
                || !mercadoPagoService.verifyWebhookSignature(signature, requestId, dataId)) {
            log.warn("[MERCADO-PAGO] Notificação de pagamento rejeitada por assinatura ausente/inválida.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        mercadoPagoService.processPaymentNotification(dataId);
        return ResponseEntity.ok().build();
    }
}
