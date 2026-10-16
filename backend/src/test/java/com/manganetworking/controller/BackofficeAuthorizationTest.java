package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityConfig;
import com.manganetworking.service.moderation.ModerationApplicationService;
import com.manganetworking.service.moderation.dto.PendingReportResponseDto;
import com.manganetworking.service.session.SessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Autorização server-side da fila editorial de moderação (backoffice).
 * Garante que o papel de moderador é exigido no servidor (matriz do SecurityConfig + @PreAuthorize),
 * não apenas escondido na interface.
 */
@WebMvcTest(controllers = ReportController.class)
@Import(SecurityConfig.class)
@DisplayName("Backoffice de moderação — autorização server-side")
class BackofficeAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ModerationApplicationService moderationService;

    // O slice @WebMvcTest inclui beans Filter; a SessionAuthenticationFilter depende deste serviço.
    @MockitoBean
    private SessionService sessionService;

    @Test
    @DisplayName("Anônimo na fila de denúncias → 401 (autenticação obrigatória)")
    void anonymousCannotListPendingReports() throws Exception {
        mockMvc.perform(get("/api/reports/pending"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Leitor autenticado na fila de denúncias → 403 (papel insuficiente)")
    @WithMockUser(roles = "READER")
    void readerCannotListPendingReports() throws Exception {
        mockMvc.perform(get("/api/reports/pending"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Moderador na fila de denúncias → 200 com o conteúdo")
    @WithMockUser(roles = "MODERATOR")
    void moderatorCanListPendingReports() throws Exception {
        UUID reportId = UUID.randomUUID();
        when(moderationService.getPendingReports()).thenReturn(List.of(
                new PendingReportResponseDto(
                        reportId, UUID.randomUUID(), "Obra Analisada", "/api/storage/capa.jpg",
                        null, null, "COPYRIGHT_PIRACY", "Publicada sem autorização", "PENDING",
                        "2026-10-16T10:00:00"
                )
        ));

        mockMvc.perform(get("/api/reports/pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].workTitle").value("Obra Analisada"))
                .andExpect(jsonPath("$[0].id").value(reportId.toString()));
    }

    @Test
    @DisplayName("Leitor não pode aplicar suspensão cautelar → 403")
    @WithMockUser(roles = "READER")
    void readerCannotSuspendWork() throws Exception {
        mockMvc.perform(post("/api/reports/moderate/suspend/{workId}", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"tentativa indevida\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Anônimo não pode aplicar suspensão cautelar → 401")
    void anonymousCannotSuspendWork() throws Exception {
        mockMvc.perform(post("/api/reports/moderate/suspend/{workId}", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"tentativa indevida\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Moderador aplica suspensão cautelar → 200")
    @WithMockUser(roles = "MODERATOR")
    void moderatorCanSuspendWork() throws Exception {
        mockMvc.perform(post("/api/reports/moderate/suspend/{workId}", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Violação confirmada dos Termos de Uso\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").exists());
    }
}
