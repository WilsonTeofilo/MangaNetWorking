package com.manganetworking.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.service.auth.AuthApplicationService;
import com.manganetworking.service.auth.dto.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AuthController.class)
@AutoConfigureMockMvc(addFilters = false) // Isola o controller para focar na validação de DTOs e fluxos
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthApplicationService authApplicationService;

    @MockBean
    private com.manganetworking.service.auth.PasswordResetApplicationService passwordResetApplicationService;

    @MockBean
    private com.manganetworking.service.session.SessionService sessionService;

    @MockBean
    private com.manganetworking.repository.jpa.UserRepository userRepository;

    @Test
    void shouldRegisterSuccessfullyAndReturn2FaRequired() throws Exception {
        RegisterRequestDto dto = new RegisterRequestDto(
                "Leitor Válido",
                "leitor@valido.com",
                "senhaForte99!",
                false,
                null,
                null,
                true,
                true,
                "2026-10-v1",
                java.time.LocalDate.of(1990, 1, 1)
        );

        when(authApplicationService.register(any(), any())).thenReturn(Map.of(
                "status", "2FA_REQUIRED",
                "message", "Cadastro criado. Digite o código de 6 dígitos enviado para seu e-mail.",
                "email", "leitor@valido.com"
        ));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("2FA_REQUIRED"))
                .andExpect(jsonPath("$.email").value("leitor@valido.com"));
    }

    @Test
    void shouldRejectRegisterWithInvalidEmailOrShortPassword() throws Exception {
        // Payload inválido: email zoado e senha com menos de 8 caracteres
        String invalidPayload = """
                {
                    "name": "A",
                    "email": "not-an-email",
                    "password": "123"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldRejectUnknownSecurityFieldsDuringRegistration() throws Exception {
        String payload = """
                {
                    "name": "Leitor",
                    "email": "leitor@valido.com",
                    "password": "senhaForte99!",
                    "twoFactorEnabled": false,
                    "role": "MODERATOR"
                }
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest());

        verify(authApplicationService, never()).register(any(), any());
    }

    @Test
    void passwordResetRequestReturnsGenericAcceptedResponse() throws Exception {
        when(passwordResetApplicationService.request(any(), any())).thenReturn(Map.of(
                "status", "REQUEST_ACCEPTED", "message", "Se o e-mail estiver cadastrado, enviaremos instruções para recuperar a senha."));
        mockMvc.perform(post("/api/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reader@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REQUEST_ACCEPTED"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    void passwordResetConfirmAcceptsOnlyLinkTokenAndPassword() throws Exception {
        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"opaque-token\",\"newPassword\":\"A long safe phrase 2026!\"}"))
                .andExpect(status().isNoContent());
        verify(passwordResetApplicationService).confirm(any());
    }

    @Test
    void passwordResetConfirmMapsInvalidTokenToUnauthorized() throws Exception {
        doThrow(new SecurityException("Link inválido ou expirado. Solicite uma nova recuperação de senha."))
                .when(passwordResetApplicationService).confirm(any());

        mockMvc.perform(post("/api/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"opaque-token\",\"newPassword\":\"A long safe phrase 2026!\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Link inválido ou expirado. Solicite uma nova recuperação de senha."));
    }

    @Test
    void shouldRejectVerify2FaWithInvalidCodeLength() throws Exception {
        // Código 2FA deve ser exatamente 6 dígitos numéricos
        String invalidCodePayload = """
                {
                    "email": "leitor@teste.com",
                    "code": "123"
                }
                """;

        mockMvc.perform(post("/api/auth/2fa/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidCodePayload))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldAuthenticateWhen2FaIsValid() throws Exception {
        Verify2FaRequestDto dto = new Verify2FaRequestDto("leitor@teste.com", "123456");
        AuthSessionResponseDto sessionDto = new AuthSessionResponseDto(
                UUID.randomUUID(),
                "Leitor Teste",
                "leitor@teste.com",
                "",
                false,
                null,
                null,
                false
        );

        when(authApplicationService.verify2Fa(any(), any())).thenReturn(sessionDto);

        mockMvc.perform(post("/api/auth/2fa/verify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AUTHENTICATED"))
                .andExpect(jsonPath("$.user.email").value("leitor@teste.com"));
    }
}
