package com.manganetworking.service.auth;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.auth.dto.*;
import com.manganetworking.service.mfa.DevOutboxNotificationSender;
import com.manganetworking.service.mfa.DevOutboxRepository;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.session.SessionStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthApplicationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private SessionStore sessionStore;

    private DevOutboxRepository devOutboxRepository;
    private TwoFactorAuthService twoFactorAuthService;
    private SessionService sessionService;
    private BCryptPasswordEncoder passwordEncoder;
    private AuthApplicationService authService;

    @BeforeEach
    void setUp() {
        devOutboxRepository = new DevOutboxRepository();
        twoFactorAuthService = new TwoFactorAuthService(new DevOutboxNotificationSender(devOutboxRepository));
        
        sessionService = new SessionService(sessionStore, new PlatformProperties());
        
        passwordEncoder = new BCryptPasswordEncoder(10);

        authService = new AuthApplicationService(
                userRepository,
                creatorRepository,
                twoFactorAuthService,
                sessionService,
                passwordEncoder
        );
    }

    @Test
    void shouldRegisterUserWithHashedPasswordAndTrigger2Fa() {
        RegisterRequestDto dto = new RegisterRequestDto(
                "Teófilo",
                "teofilo@teste.com",
                "senhaForte123!",
                false,
                null,
                null,
                true
        );

        when(userRepository.findByEmail("teofilo@teste.com")).thenReturn(Optional.empty());

        Map<String, Object> result = authService.register(dto);
        assertEquals("2FA_REQUIRED", result.get("status"));

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());

        UserEntity savedUser = captor.getValue();
        assertEquals("teofilo@teste.com", savedUser.getEmail());
        // A senha deve estar hasheada com BCrypt, NUNCA em texto plano
        assertNotEquals("senhaForte123!", savedUser.getPasswordHash());
        assertTrue(passwordEncoder.matches("senhaForte123!", savedUser.getPasswordHash()));

        // Verifica que o OTP foi enviado para a Dev Outbox
        Optional<DevOutboxRepository.DevOutboxMessage> message = devOutboxRepository.findLatest("teofilo@teste.com");
        assertTrue(message.isPresent());
        assertEquals(6, message.get().otpCode().length());
    }

    @Test
    void shouldRejectLoginWithInvalidPassword() {
        UserEntity user = new UserEntity();
        user.setEmail("leitor@teste.com");
        user.setPasswordHash(passwordEncoder.encode("senhaCorreta123"));

        when(userRepository.findByEmail("leitor@teste.com")).thenReturn(Optional.of(user));

        LoginRequestDto dto = new LoginRequestDto("leitor@teste.com", "senhaErrada");

        SecurityException ex = assertThrows(SecurityException.class, () ->
                authService.login(dto)
        );
        assertEquals("Credenciais inválidas", ex.getMessage());
    }

    @Test
    void shouldCompleteFullAuthFlowViaDevOutboxAndSetHttpOnlyCookie() {
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setName("Escritor Will");
        user.setEmail("will@teste.com");
        user.setCreator(true);
        user.setPasswordHash(passwordEncoder.encode("minhaSenha123"));

        when(userRepository.findByEmail("will@teste.com")).thenReturn(Optional.of(user));
        when(creatorRepository.findByUserId(userId)).thenReturn(Optional.empty());

        // 1. Inicia login
        Map<String, Object> loginResult = authService.login(new LoginRequestDto("will@teste.com", "minhaSenha123"));
        assertEquals("2FA_REQUIRED", loginResult.get("status"));

        // 2. Recupera OTP da Dev Outbox (ambiente local seguro)
        String otpCode = devOutboxRepository.findLatest("will@teste.com")
                .orElseThrow()
                .otpCode();

        // 3. Valida 2FA e recebe cookie de sessão HttpOnly
        MockHttpServletResponse response = new MockHttpServletResponse();
        AuthSessionResponseDto sessionDto = authService.verify2Fa(
                new Verify2FaRequestDto("will@teste.com", otpCode),
                response
        );

        assertNotNull(sessionDto);
        assertEquals("will@teste.com", sessionDto.email());
        assertEquals("Escritor Will", sessionDto.name());

        // Cookie de sessão HttpOnly emitido
        var cookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(cookie);
        assertTrue(cookie.isHttpOnly());
        assertNotNull(cookie.getValue());
    }

    @Test
    void shouldReject2FaBypassWithInvalidCode() {
        twoFactorAuthService.generateAndSendOtp("alvo@teste.com", "alvo@teste.com");

        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityException ex = assertThrows(SecurityException.class, () ->
                authService.verify2Fa(new Verify2FaRequestDto("alvo@teste.com", "000000"), response)
        );
        assertEquals("Código 2FA incorreto ou expirado", ex.getMessage());
        assertNull(response.getCookie(SessionService.SESSION_COOKIE_NAME));
    }
}
