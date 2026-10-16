package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityConfig;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.user.UserProfileApplicationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regressão anti-IDOR: os endpoints de perfil devem derivar a identidade exclusivamente da
 * sessão autenticada, ignorando qualquer identificador enviado pelo cliente (ex.: X-Current-User-Id).
 */
@WebMvcTest(controllers = UserProfileController.class)
@Import(SecurityConfig.class)
@DisplayName("Identidade de perfil — somente da sessão (anti-IDOR)")
class UserProfileIdentityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserProfileApplicationService profileService;

    // Bean Filter incluído no slice @WebMvcTest; depende deste serviço.
    @MockitoBean
    private SessionService sessionService;

    private static Authentication sessionAuth(UUID userId) {
        SessionService.UserSession session = new SessionService.UserSession(
                "sess-" + userId, userId, "leitor@mn.dev", "Leitor Teste",
                false, false, null, null, Instant.now().plusSeconds(3600)
        );
        return new UsernamePasswordAuthenticationToken(
                session, null, List.of(new SimpleGrantedAuthority("ROLE_READER")));
    }

    @Test
    @DisplayName("Exclusão de conta usa o ID da sessão e ignora X-Current-User-Id forjado")
    void deleteAccountIgnoresSpoofedHeader() throws Exception {
        UUID sessionUserId = UUID.randomUUID();
        UUID spoofedId = UUID.randomUUID();

        mockMvc.perform(delete("/api/users/me")
                        .header("X-Current-User-Id", spoofedId.toString())
                        .with(authentication(sessionAuth(sessionUserId))))
                .andExpect(status().isOk());

        verify(profileService).deleteUserAccountLgpd(sessionUserId);
        verify(profileService, never()).deleteUserAccountLgpd(spoofedId);
    }

    @Test
    @DisplayName("Histórico de leitura usa o ID da sessão, não o header")
    void readingHistoryUsesSessionId() throws Exception {
        UUID sessionUserId = UUID.randomUUID();
        UUID spoofedId = UUID.randomUUID();

        mockMvc.perform(get("/api/users/reading-progress")
                        .header("X-Current-User-Id", spoofedId.toString())
                        .with(authentication(sessionAuth(sessionUserId))))
                .andExpect(status().isOk());

        verify(profileService).getReadingHistory(sessionUserId.toString());
        verify(profileService, never()).getReadingHistory(spoofedId.toString());
    }

    @Test
    @DisplayName("Autenticação sem sessão de usuário válida → 403 (sem identidade autoritativa)")
    void authenticationWithoutUserSessionIsForbidden() throws Exception {
        Authentication generic = new UsernamePasswordAuthenticationToken(
                "leitor", null, List.of(new SimpleGrantedAuthority("ROLE_READER")));

        mockMvc.perform(delete("/api/users/me").with(authentication(generic)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Track de leitura sem totalPages → 400 e serviço nunca chamado (contrato TrackPageRequestDto)")
    void trackPageWithoutTotalPagesIsRejected() throws Exception {
        UUID sessionUserId = UUID.randomUUID();

        mockMvc.perform(post("/api/users/reading-progress/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workId\":\"" + UUID.randomUUID() + "\",\"chapterId\":\""
                                + UUID.randomUUID() + "\",\"page\":1}")
                        .with(authentication(sessionAuth(sessionUserId))))
                .andExpect(status().isBadRequest());

        verify(profileService, never()).trackPage(anyString(), any());
    }

    @Test
    @DisplayName("Track de leitura com totalPages usa a identidade da sessão → 200")
    void trackPageWithTotalPagesUsesSessionIdentity() throws Exception {
        UUID sessionUserId = UUID.randomUUID();

        mockMvc.perform(post("/api/users/reading-progress/track")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"workId\":\"" + UUID.randomUUID() + "\",\"chapterId\":\""
                                + UUID.randomUUID() + "\",\"page\":1,\"totalPages\":40}")
                        .with(authentication(sessionAuth(sessionUserId))))
                .andExpect(status().isOk());

        verify(profileService).trackPage(eq(sessionUserId.toString()), any());
    }
}
