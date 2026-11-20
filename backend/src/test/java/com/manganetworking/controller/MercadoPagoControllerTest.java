package com.manganetworking.controller;

import com.manganetworking.service.auth.AuthApplicationService;
import com.manganetworking.service.monetization.PaymentGatewayPort;
import com.manganetworking.service.session.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class MercadoPagoControllerTest {

    @Test
    @DisplayName("GET /vip/price retorna status 200 e valor configurado no gateway")
    void getVipPriceReturnsConfiguredAmount() {
        PaymentGatewayPort port = mock(PaymentGatewayPort.class);
        when(port.getVipPrice()).thenReturn(new BigDecimal("23.00"));
        MercadoPagoController controller = new MercadoPagoController(port, mock(AuthApplicationService.class));

        var response = controller.getVipPrice();

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("priceBrl")).isEqualTo(new BigDecimal("23.00"));
        verify(port).getVipPrice();
    }

    @Test
    @DisplayName("POST /vip/checkout gera preferência via PaymentGatewayPort e retorna URL com preço")
    void createVipCheckoutReturnsCheckoutUrlAndPrice() {
        PaymentGatewayPort port = mock(PaymentGatewayPort.class);
        AuthApplicationService authService = mock(AuthApplicationService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);
        UUID userId = UUID.randomUUID();

        SessionService.UserSession session = new SessionService.UserSession(
                "sess-123", userId, "reader@teste.com", "Reader", false, false, false, null, null, Instant.now().plusSeconds(3600)
        );
        when(authService.getCurrentSession(request)).thenReturn(Optional.of(session));
        when(port.createVipCheckoutPreference(userId)).thenReturn("https://www.mercadopago.com.br/checkout/start?pref_id=123");
        when(port.getVipPrice()).thenReturn(new BigDecimal("23.00"));

        MercadoPagoController controller = new MercadoPagoController(port, authService);
        var response = controller.createVipCheckout(request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("checkoutUrl")).isEqualTo("https://www.mercadopago.com.br/checkout/start?pref_id=123");
        assertThat(response.getBody().get("priceBrl")).isEqualTo(new BigDecimal("23.00"));
        verify(port).createVipCheckoutPreference(userId);
        verify(port).getVipPrice();
    }

    @Test
    void webhookRejectsMissingSignatureWithoutProcessing() {
        PaymentGatewayPort port = mock(PaymentGatewayPort.class);
        MercadoPagoController controller = new MercadoPagoController(port, mock(AuthApplicationService.class));

        var response = controller.handleWebhook(null, null, "123", "payment", Map.of("data", Map.of("id", "123")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(port, never()).processPaymentNotification("123");
    }

    @Test
    void webhookRejectsPaymentMissingDataId() {
        PaymentGatewayPort port = mock(PaymentGatewayPort.class);
        MercadoPagoController controller = new MercadoPagoController(port, mock(AuthApplicationService.class));

        var response = controller.handleWebhook("signed", "request", null, "payment", Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(port, never()).processPaymentNotification(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void webhookAcknowledgesNonPaymentNotificationsWithoutProcessing() {
        PaymentGatewayPort port = mock(PaymentGatewayPort.class);
        MercadoPagoController controller = new MercadoPagoController(port, mock(AuthApplicationService.class));

        var response = controller.handleWebhook(null, null, "123", "merchant_order", Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(port, never()).processPaymentNotification("123");
    }

    @Test
    void webhookProcessesPaymentWhenSignatureIsValid() {
        PaymentGatewayPort port = mock(PaymentGatewayPort.class);
        when(port.verifyWebhookSignature("signed", "req-1", "123")).thenReturn(true);
        MercadoPagoController controller = new MercadoPagoController(port, mock(AuthApplicationService.class));

        var response = controller.handleWebhook("signed", "req-1", "123", "payment", Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(port).processPaymentNotification("123");
    }
}
