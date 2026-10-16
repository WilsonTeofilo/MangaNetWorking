package com.manganetworking.controller;

import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.ChapterFileAccessGuard;
import com.manganetworking.service.storage.FileStorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = FileStorageController.class)
@AutoConfigureMockMvc(addFilters = false) // Foca no comportamento de entrega/authorization do controller
class FileStorageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FileStorageService fileStorageService;

    @MockitoBean
    private ChapterFileAccessGuard fileAccessGuard;

    @MockitoBean
    private SessionService sessionService;

    @Test
    void returnsNotFoundWhenFileDoesNotExist() throws Exception {
        when(fileStorageService.exists("inexistente.jpg")).thenReturn(false);

        mockMvc.perform(get("/api/storage/inexistente.jpg"))
                .andExpect(status().isNotFound());
    }

    @Test
    void returnsForbiddenWhenGuardDeniesChapterPage() throws Exception {
        when(fileStorageService.exists("antecipado.jpg")).thenReturn(true);
        when(fileAccessGuard.evaluate("antecipado.jpg"))
                .thenReturn(new ChapterFileAccessGuard.AccessDecision(false, true));

        mockMvc.perform(get("/api/storage/antecipado.jpg"))
                .andExpect(status().isForbidden());
    }

    @Test
    void returnsBytesWhenAccessIsAllowed() throws Exception {
        when(fileStorageService.exists("capa.jpg")).thenReturn(true);
        when(fileAccessGuard.evaluate("capa.jpg"))
                .thenReturn(new ChapterFileAccessGuard.AccessDecision(true, false));
        when(fileStorageService.loadFile("capa.jpg")).thenReturn(new byte[]{1, 2, 3});

        mockMvc.perform(get("/api/storage/capa.jpg"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "public, max-age=86400, immutable"));
    }
}
