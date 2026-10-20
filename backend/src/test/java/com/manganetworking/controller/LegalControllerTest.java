package com.manganetworking.controller;

import com.manganetworking.service.user.PrivacyPolicyPublicationService;
import com.manganetworking.service.user.dto.PrivacyPolicyDocumentDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = LegalController.class)
@AutoConfigureMockMvc(addFilters = false)
class LegalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PrivacyPolicyPublicationService publicationService;

    @MockBean
    private com.manganetworking.service.session.SessionService sessionService;

    @Test
    @DisplayName("Política não publicada responde 404 com código explícito")
    void returnsNotPublishedWhenDocumentIsMissing() throws Exception {
        when(publicationService.publishedDocument()).thenReturn(Optional.empty());
        when(publicationService.currentVersion()).thenReturn("2026-10-v1");

        mockMvc.perform(get("/api/legal/privacy-policy"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("POLICY_NOT_PUBLISHED"))
                .andExpect(jsonPath("$.version").value("2026-10-v1"));
    }

    @Test
    @DisplayName("Política publicada é devolvida com metadados de aprovação")
    void returnsPublishedDocument() throws Exception {
        when(publicationService.publishedDocument()).thenReturn(Optional.of(new PrivacyPolicyDocumentDto(
                "2026-10-v1", "2026-10-01", "Encarregado de Dados", "ATA-2026-001",
                "a".repeat(64), "# Política de Privacidade")));

        mockMvc.perform(get("/api/legal/privacy-policy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value("2026-10-v1"))
                .andExpect(jsonPath("$.approvedBy").value("Encarregado de Dados"))
                .andExpect(jsonPath("$.approvalReference").value("ATA-2026-001"))
                .andExpect(jsonPath("$.content").value("# Política de Privacidade"));
    }
}
