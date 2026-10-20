package com.manganetworking.controller;

import com.manganetworking.service.auth.AuthApplicationService;
import com.manganetworking.service.monetization.MercadoPagoService;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class MercadoPagoControllerTest {

    @Test
    void webhookRejectsMissingSignatureWithoutProcessing() {
        MercadoPagoService service = mock(MercadoPagoService.class);
        MercadoPagoController controller = new MercadoPagoController(service, mock(AuthApplicationService.class));

        var response = controller.handleWebhook(null, null, "123", "payment", Map.of("data", Map.of("id", "123")));

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(service, never()).processPaymentNotification("123");
    }

    @Test
    void webhookRejectsPaymentMissingDataId() {
        MercadoPagoService service = mock(MercadoPagoService.class);
        MercadoPagoController controller = new MercadoPagoController(service, mock(AuthApplicationService.class));

        var response = controller.handleWebhook("signed", "request", null, "payment", Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        verify(service, never()).processPaymentNotification(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void webhookAcknowledgesNonPaymentNotificationsWithoutProcessing() {
        MercadoPagoService service = mock(MercadoPagoService.class);
        MercadoPagoController controller = new MercadoPagoController(service, mock(AuthApplicationService.class));

        var response = controller.handleWebhook(null, null, "123", "merchant_order", Map.of());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(service, never()).processPaymentNotification("123");
    }
}
