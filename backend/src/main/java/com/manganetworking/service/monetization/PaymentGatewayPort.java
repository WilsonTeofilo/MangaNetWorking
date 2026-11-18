package com.manganetworking.service.monetization;

import com.manganetworking.service.monetization.dto.CheckoutResponseDto;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Porta de saída (Output Port / Clean Architecture) para provedores de pagamento.
 *
 * <p>Isola o domínio de monetização e os controladores REST de implementações específicas
 * de gateways (ex.: Mercado Pago, Stripe ou Sandbox local), conforme preconizado na ADR-003.</p>
 */
public interface PaymentGatewayPort {

    BigDecimal getVipPrice();

    CheckoutResponseDto createDonationCheckoutPreference(
            UUID payerUserId,
            UUID creatorId,
            UUID workId,
            UUID chapterId,
            BigDecimal amountBrl,
            String message,
            String idempotencyKey
    );

    CheckoutResponseDto createMembershipCheckoutPreference(
            UUID payerUserId,
            UUID creatorId,
            String idempotencyKey
    );

    String createVipCheckoutPreference(UUID userId);

    boolean verifyWebhookSignature(String signatureHeader, String requestIdHeader, String dataId);

    void processPaymentNotification(String paymentId);
}
