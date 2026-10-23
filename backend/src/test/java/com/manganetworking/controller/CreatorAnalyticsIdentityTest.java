package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityConfig;
import com.manganetworking.service.creator.CreatorAnalyticsApplicationService;
import com.manganetworking.service.creator.SeasonService;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import com.manganetworking.service.session.SessionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regressão anti-IDOR dos endpoints de analytics.
 *
 * <p>O criador A não consegue ampliar o escopo enviando {@code creatorId}, {@code workId}
 * ou {@code chapterId} na URL: o controller não lê esses parâmetros e o serviço recebe
 * apenas o ID derivado da sessão. Leitor sem papel de criador recebe 403; anônimo, 401.</p>
 */
@WebMvcTest(controllers = CreatorAnalyticsController.class)
@Import(SecurityConfig.class)
@DisplayName("Analytics do criador — identidade só da sessão (anti-IDOR)")
class CreatorAnalyticsIdentityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CreatorAnalyticsApplicationService analyticsService;

    @MockitoBean
    private SeasonService seasonService;

    @MockitoBean
    private SessionService sessionService;

    private static Authentication creatorAuth(UUID userId, UUID creatorId) {
        SessionService.UserSession session = new SessionService.UserSession(
                "sess-" + userId, userId, "criador@mn.dev", "Criador Teste",
                true, false, false, creatorId, "criador-teste", Instant.now().plusSeconds(3600)
        );
        return new UsernamePasswordAuthenticationToken(
                session, null,
                List.of(new SimpleGrantedAuthority("ROLE_CREATOR"), new SimpleGrantedAuthority("ROLE_READER")));
    }

    private static CreatorAnalyticsResponseDto emptyAnalytics() {
        return new CreatorAnalyticsResponseDto(
                28, LocalDate.now().minusDays(27), LocalDate.now(),
                List.of(), List.of(),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                0,
                new CreatorAnalyticsResponseDto.TotalsDto(0, 0, 0, 0, 0, null),
                List.of(), List.of(),
                new CreatorAnalyticsResponseDto.ComparisonDto(
                        LocalDate.now().minusDays(55), LocalDate.now().minusDays(28), 0, 0, List.of()),
                new CreatorAnalyticsResponseDto.FunnelDto(0, 0, 0, 0, null),
                new CreatorAnalyticsResponseDto.AudienceHeatmapDto(
                        "America/Sao_Paulo", 28, 0, List.of())
        );
    }

    @Test
    @DisplayName("workId/chapterId/creatorId forjados na URL não trocam o criador da sessão")
    void analyticsIgnoresSpoofedIdentifiers() throws Exception {
        UUID sessionUserId = UUID.randomUUID();
        UUID creatorA = UUID.randomUUID();
        UUID creatorB = UUID.randomUUID();
        UUID workOfB = UUID.randomUUID();
        UUID chapterOfB = UUID.randomUUID();

        mockMvc.perform(get("/api/creators/analytics")
                        .param("days", "28")
                        .param("creatorId", creatorB.toString())
                        .param("workId", workOfB.toString())
                        .param("chapterId", chapterOfB.toString())
                        .with(authentication(creatorAuth(sessionUserId, creatorA))))
                .andExpect(status().isOk());

        verify(analyticsService).getAnalytics(creatorA, 28);
        verify(analyticsService, never()).getAnalytics(eq(creatorB), any(Integer.class));
    }

    @Test
    @DisplayName("exportação CSV também deriva o criador da sessão e ignora IDs forjados")
    void csvExportIgnoresSpoofedIdentifiers() throws Exception {
        UUID sessionUserId = UUID.randomUUID();
        UUID creatorA = UUID.randomUUID();
        UUID creatorB = UUID.randomUUID();

        when(analyticsService.getAnalytics(eq(creatorA), any(Integer.class)))
                .thenReturn(emptyAnalytics());

        mockMvc.perform(get("/api/creators/analytics/export.csv")
                        .param("days", "28")
                        .param("creatorId", creatorB.toString())
                        .param("workId", UUID.randomUUID().toString())
                        .with(authentication(creatorAuth(sessionUserId, creatorA))))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"));

        verify(analyticsService).getAnalytics(creatorA, 28);
        verify(analyticsService, never()).getAnalytics(eq(creatorB), any(Integer.class));
    }

    @Test
    @DisplayName("leitor sem papel de criador recebe 403, mesmo autenticado")
    void readerCannotReadCreatorAnalytics() throws Exception {
        UUID userId = UUID.randomUUID();
        SessionService.UserSession reader = new SessionService.UserSession(
                "sess-leitor", userId, "leitor@mn.dev", "Leitor", false, false, false,
                null, null, Instant.now().plusSeconds(3600));
        Authentication auth = new UsernamePasswordAuthenticationToken(
                reader, null, List.of(new SimpleGrantedAuthority("ROLE_READER")));

        mockMvc.perform(get("/api/creators/analytics").with(authentication(auth)))
                .andExpect(status().isForbidden());

        verify(analyticsService, never()).getAnalytics(any(), any(Integer.class));
    }

    @Test
    @DisplayName("anônimo recebe 401 (não 200 nem 500)")
    void anonymousIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/creators/analytics"))
                .andExpect(status().isUnauthorized());
    }
}
