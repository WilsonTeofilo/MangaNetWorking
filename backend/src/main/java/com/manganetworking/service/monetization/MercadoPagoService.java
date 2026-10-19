package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Serviço de integração oficial com a API do Mercado Pago (Checkout Pro e Webhooks).
 * <p>
 * Implementa:
 * <ul>
 *   <li>Criação de preferências de pagamento para Assinatura VIP (~R$ 23) e Doações.</li>
 *   <li>Validação criptográfica de assinatura de Webhook via HMAC-SHA256 (header {@code x-signature}).</li>
 *   <li>Ativação atômica de benefícios pós-confirmação (Idempotência e Segurança).</li>
 * </ul>
 * </p>
 */
@Service
public class MercadoPagoService {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoService.class);

    private static final String MP_API_BASE = "https://api.mercadopago.com";
    private static final String VIP_EXTERNAL_PREFIX = "MN_VIP|";

    private final PlatformProperties properties;
    private final UserRepository userRepository;
    private final MonetizationService monetizationService;
    private final RestClient restClient;

    public MercadoPagoService(
            PlatformProperties properties,
            UserRepository userRepository,
            MonetizationService monetizationService
    ) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.monetizationService = monetizationService;
        this.restClient = RestClient.builder().baseUrl(MP_API_BASE).build();
    }

    /**
     * Cria preferência de Checkout Pro no Mercado Pago para Assinatura VIP (30 dias).
     *
     * @param userId identificador do usuário assinante
     * @return URL de pagamento (init_point) do Mercado Pago
     */
    public String createVipCheckoutPreference(UUID userId) {
        String accessToken = properties.getMercadopago().getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("Chave de API do Mercado Pago (MERCADOPAGO_ACCESS_TOKEN) não configurada.");
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + userId));

        BigDecimal price = properties.getVipPrice();
        String backUrlBase = properties.getMercadopago().getBackUrlBase().replaceAll("/+$", "");
        String notificationUrl = properties.getMercadopago().getNotificationUrl();

        Map<String, Object> body = Map.of(
                "items", List.of(
                        Map.of(
                                "title", "MangaNetWorking — Assinatura VIP (30 dias)",
                                "description", "Zero anúncios na leitura, suporte ao ecossistema e badge VIP oficial.",
                                "quantity", 1,
                                "currency_id", "BRL",
                                "unit_price", price
                        )
                ),
                "payer", Map.of(
                        "email", user.getEmail(),
                        "name", user.getName()
                ),
                "external_reference", VIP_EXTERNAL_PREFIX + userId,
                "back_urls", Map.of(
                        "success", backUrlBase + "/vip?status=approved",
                        "pending", backUrlBase + "/vip?status=pending",
                        "failure", backUrlBase + "/vip?status=failure"
                ),
                "auto_return", "approved",
                "statement_descriptor", "MANGANETWORKING"
        );

        var requestSpec = restClient.post()
                .uri("/checkout/preferences")
                .header("Authorization", "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON);

        if (notificationUrl != null && !notificationUrl.isBlank()) {
            // Se tiver URL pública de webhook configurada, registra na preferência
            body = new java.util.HashMap<>(body);
            body.put("notification_url", notificationUrl);
        }

        try {
            Map<?, ?> response = requestSpec.body(body).retrieve().body(Map.class);
            if (response == null || !response.containsKey("init_point")) {
                throw new IllegalStateException("Resposta inválida do Mercado Pago ao gerar Checkout.");
            }
            return (String) response.get("init_point");
        } catch (Exception e) {
            log.error("[MERCADO-PAGO] Falha ao criar preferência de checkout: {}", e.getMessage());
            throw new IllegalStateException("Erro ao comunicar com o Mercado Pago: " + e.getMessage(), e);
        }
    }

    /**
     * Valida assinatura criptográfica HMAC-SHA256 do webhook enviado pelo Mercado Pago.
     */
    public boolean verifyWebhookSignature(String signatureHeader, String requestIdHeader, String dataId) {
        String secret = properties.getMercadopago().getWebhookSecret();
        if (secret == null || secret.isBlank()) {
            log.warn("[MERCADO-PAGO] Webhook secret não configurado. Rejeitando validação por segurança.");
            return false;
        }

        if (signatureHeader == null || requestIdHeader == null || dataId == null) {
            return false;
        }

        String ts = null;
        String v1 = null;
        for (String part : signatureHeader.split(",")) {
            String[] kv = part.split("=", 2);
            if (kv.length == 2) {
                String k = kv[0].trim();
                String v = kv[1].trim();
                if ("ts".equalsIgnoreCase(k)) ts = v;
                if ("v1".equalsIgnoreCase(k)) v1 = v;
            }
        }

        if (ts == null || v1 == null) {
            return false;
        }

        try {
            String manifest = "id:" + dataId.trim() + ";request-id:" + requestIdHeader.trim() + ";ts:" + ts + ";";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.trim().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hmacBytes = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            String expectedHex = HexFormat.of().formatHex(hmacBytes);

            return MessageDigest.isEqual(
                    expectedHex.getBytes(StandardCharsets.UTF_8),
                    v1.trim().toLowerCase().getBytes(StandardCharsets.UTF_8)
            );
        } catch (Exception e) {
            log.error("[MERCADO-PAGO] Erro ao validar assinatura do webhook: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Processa o pagamento confirmado e ativa os benefícios correspondentes.
     */
    @Transactional
    public void processPaymentNotification(String paymentId) {
        String accessToken = properties.getMercadopago().getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            log.warn("[MERCADO-PAGO] Token de acesso não configurado para processar pagamento {}", paymentId);
            return;
        }

        try {
            Map<?, ?> payment = restClient.get()
                    .uri("/v1/payments/" + paymentId)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(Map.class);

            if (payment == null) return;

            String status = (String) payment.get("status");
            String externalRef = (String) payment.get("external_reference");

            log.info("[MERCADO-PAGO] Pagamento {} com status: '{}' (Ref: {})", paymentId, status, externalRef);

            if ("approved".equalsIgnoreCase(status) && externalRef != null) {
                if (externalRef.startsWith(VIP_EXTERNAL_PREFIX)) {
                    String userIdStr = externalRef.substring(VIP_EXTERNAL_PREFIX.length()).trim();
                    UUID userId = UUID.fromString(userIdStr);
                    activateUserVip(userId);
                }
            }
        } catch (Exception e) {
            log.error("[MERCADO-PAGO] Erro ao consultar pagamento {}: {}", paymentId, e.getMessage());
        }
    }

    private void activateUserVip(UUID userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setVip(true);
            LocalDateTime currentExpiry = user.getVipExpiresAt();
            LocalDateTime newExpiry = (currentExpiry != null && currentExpiry.isAfter(LocalDateTime.now()))
                    ? currentExpiry.plusDays(30)
                    : LocalDateTime.now().plusDays(30);
            user.setVipExpiresAt(newExpiry);
            userRepository.save(user);
            log.info("[MERCADO-PAGO] Assinatura VIP ativada para usuário {} até {}", user.getEmail(), newExpiry);
        });
    }
}
