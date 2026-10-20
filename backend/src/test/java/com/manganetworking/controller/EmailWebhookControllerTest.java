package com.manganetworking.controller;

import com.manganetworking.service.email.EmailSuppressionService;
import com.manganetworking.service.email.dto.EmailDeliveryEventDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EmailWebhookController.class,
        properties = "spring.mail.webhook-secret=segredo-de-webhook-de-email-32-chars-min")
@AutoConfigureMockMvc(addFilters = false)
class EmailWebhookControllerTest {

    private static final String SECRET = "segredo-de-webhook-de-email-32-chars-min";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EmailSuppressionService suppressionService;

    @MockBean
    private com.manganetworking.service.session.SessionService sessionService;

    @Test
    @DisplayName("Webhook sem segredo é recusado")
    void rejectsMissingSecret() throws Exception {
        mockMvc.perform(post("/api/webhooks/email/delivery-events")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"leitor@exemplo.test","eventType":"bounce","reason":"mailbox not found"}
                                """))
                .andExpect(status().isUnauthorized());

        verify(suppressionService, never()).record(any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Webhook com segredo errado é recusado")
    void rejectsWrongSecret() throws Exception {
        mockMvc.perform(post("/api/webhooks/email/delivery-events")
                        .header("X-Email-Webhook-Secret", "segredo-errado")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"leitor@exemplo.test","eventType":"bounce"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Webhook válido registra o evento")
    void recordsEvent() throws Exception {
        when(suppressionService.isSuppressed(any())).thenReturn(false);

        mockMvc.perform(post("/api/webhooks/email/delivery-events")
                        .header("X-Email-Webhook-Secret", SECRET)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"leitor@exemplo.test","eventType":"bounce","reason":"mailbox not found","provider":"smtp"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RECORDED"));

        verify(suppressionService).record(any(), any(), any(), any(), any());
    }
}
