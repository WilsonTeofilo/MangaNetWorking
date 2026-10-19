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

    /**
     * Inicia o fluxo de assinatura VIP gerando a URL oficial de Checkout do Mercado Pago.
     */
    @PostMapping("/vip/checkout")
    public ResponseEntity<Map<String, String>> createVipCheckout(HttpServletRequest request) {
        SessionService.UserSession session = authService.getCurrentSession(request)
                .orElseThrow(() -> new AccessDeniedException("Autenticação necessária para assinar o plano VIP."));

        String initPointUrl = mercadoPagoService.createVipCheckoutPreference(session.userId());

        return ResponseEntity.ok(Map.of(
                "checkoutUrl", initPointUrl
        ));
    }

    /**
     * Webhook de notificações de pagamento do Mercado Pago (IPN / Webhooks V2).
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestHeader(value = "x-signature", required = false) String signature,
            @RequestHeader(value = "x-request-id", required = false) String requestId,
            @RequestParam(value = "data.id", required = false) String dataIdParam,
            @RequestParam(value = "type", required = false) String type,
            @RequestBody(required = false) Map<String, Object> payload
    ) {
        String dataId = dataIdParam;
        if (dataId == null && payload != null && payload.containsKey("data")) {
            Object dataObj = payload.get("data");
            if (dataObj instanceof Map<?, ?> dataMap && dataMap.containsKey("id")) {
                dataId = String.valueOf(dataMap.get("id"));
            }
        }

        if (dataId == null) {
            return ResponseEntity.status(HttpStatus.OK).build();
        }

        // Validação opcional da assinatura se o segredo estiver configurado
        if (signature != null && requestId != null) {
            boolean valid = mercadoPagoService.verifyWebhookSignature(signature, requestId, dataId);
            if (!valid) {
                log.warn("[MERCADO-PAGO] Assinatura do webhook inválida para dataId: {}", dataId);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
        }

        mercadoPagoService.processPaymentNotification(dataId);

        return ResponseEntity.status(HttpStatus.OK).build();
    }
}
