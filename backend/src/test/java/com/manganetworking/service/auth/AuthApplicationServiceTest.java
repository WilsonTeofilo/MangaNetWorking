package com.manganetworking.service.auth;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.mfa.OtpIssuanceLimiter;
import com.manganetworking.service.auth.dto.*;
import com.manganetworking.service.mfa.DevOutboxNotificationSender;
import com.manganetworking.service.mfa.DevOutboxRepository;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.session.SessionStore;
import com.manganetworking.service.user.PrivacyComplianceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpServletRequest;
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

    @Mock
    private PrivacyComplianceService privacyComplianceService;

    private DevOutboxRepository devOutboxRepository;
    private TwoFactorAuthService twoFactorAuthService;
    private SessionService sessionService;
    private BCryptPasswordEncoder passwordEncoder;
    private AuthApplicationService authService;

    @BeforeEach
    void setUp() {
        devOutboxRepository = new DevOutboxRepository();
        twoFactorAuthService = new TwoFactorAuthService(
                new DevOutboxNotificationSender(devOutboxRepository), "teste-seguro-hmac-otp-com-mais-de-32-bytes");
        
        sessionService = new SessionService(sessionStore, new PlatformProperties());
        
        passwordEncoder = new BCryptPasswordEncoder(10);
        lenient().when(privacyComplianceService.currentPolicyVersion()).thenReturn("2026-10-v1");
        lenient().when(userRepository.save(any(UserEntity.class))).thenAnswer(invocation -> {
            UserEntity saved = invocation.getArgument(0);
            if (saved.getId() == null) saved.setId(UUID.randomUUID());
            return saved;
        });

        authService = new AuthApplicationService(
                userRepository,
                creatorRepository,
                twoFactorAuthService,
                new OtpIssuanceLimiter(null, "inmemory"),
                sessionService,
                passwordEncoder,
                privacyComplianceService,
                "test-google-client-id"
        );
    }

    @Test
    void shouldRegisterUserWithHashedPasswordAndTrigger2Fa() {
        RegisterRequestDto dto = new RegisterRequestDto("Teófilo", "teofilo", "teofilo@teste.com",
                "senhaForte123!",
                false,
                null,
                null,
                true, null, null, null, null, true, "2026-10-v1",
                java.time.LocalDate.of(1990, 1, 1)
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
    void rejectsShortRegistrationPasswordBeforeLookingUpOrSavingAnAccount() {
        RegisterRequestDto dto = new RegisterRequestDto("Leitor", "curto", "curto@teste.com", "1234567", false, null, null,
                true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        assertThrows(IllegalArgumentException.class, () -> authService.register(dto));
        verifyNoInteractions(userRepository);
    }

    @Test
    void rejectsWeakRegistrationPasswordBeforeLookingUpOrSavingAnAccount() {
        RegisterRequestDto dto = new RegisterRequestDto("Leitor", "fraca", "fraca@teste.com", "password1", false, null, null,
                true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> authService.register(dto));

        assertTrue(exception.getMessage().contains("Senha fraca"));
        verifyNoInteractions(userRepository);
    }

    @Test
    void duplicateRegistrationReturnsSameGenericResponseWithoutRevealingAccount() {
        // Conta já confirmada: o cadastro não vira e-mail nem entrega nada (é login).
        UserEntity confirmed = new UserEntity();
        confirmed.setEmail("teofilo@teste.com");
        confirmed.setEmailVerifiedAt(java.time.LocalDateTime.now());

        when(userRepository.findByEmail("teofilo@teste.com")).thenReturn(Optional.of(confirmed));
        RegisterRequestDto dto = new RegisterRequestDto("Teófilo", "teofilo", "teofilo@teste.com", "senhaForte123!", false, null, null, true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        Map<String, Object> result = authService.register(dto);

        assertEquals("2FA_REQUIRED", result.get("status"));
        assertEquals("Se os dados estiverem disponíveis, enviaremos instruções para o e-mail informado.", result.get("message"));
        verify(userRepository, never()).save(any());
        assertTrue(devOutboxRepository.findLatest("teofilo@teste.com").isEmpty());
    }

    @Test
    void creatorMayFinishRegistrationWithoutInventedCpfButCannotSubmitInvalidCpf() {
        when(userRepository.findByEmail("autor@teste.com")).thenReturn(Optional.empty());
        RegisterRequestDto noCpf = new RegisterRequestDto("Autora", "autor", "autor@teste.com", "senhaForte123!",
                true, "autora", null, true, null, "https://instagram.com/autora", null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        authService.register(noCpf);

        ArgumentCaptor<CreatorEntity> creatorCaptor = ArgumentCaptor.forClass(CreatorEntity.class);
        verify(creatorRepository).save(creatorCaptor.capture());
        assertNull(creatorCaptor.getValue().getDocumentCpf());
        assertEquals("https://instagram.com/autora", creatorCaptor.getValue().getInstagramUrl());

        RegisterRequestDto invalidCpf = new RegisterRequestDto("Outra", "outro", "outro@teste.com", "senhaForte123!",
                true, "outra", "000.000.000-00", true, null, "https://instagram.com/outra", null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));
        when(userRepository.findByEmail("outro@teste.com")).thenReturn(Optional.empty());
        assertThrows(IllegalArgumentException.class, () -> authService.register(invalidCpf));
        verify(userRepository, never()).save(argThat(user -> "outro@teste.com".equals(user.getEmail())));
    }

    @Test
    void writerRegistrationRequiresAtLeastOneSocialLink() {
        when(userRepository.findByEmail("semlink@teste.com")).thenReturn(Optional.empty());
        RegisterRequestDto dto = new RegisterRequestDto("Sem Link", "semlink", "semlink@teste.com", "senhaForte123!",
                true, "semlink", null, true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> authService.register(dto));

        assertTrue(exception.getMessage().contains("pelo menos um link"));
        verify(creatorRepository, never()).save(any());
    }

    @Test
    void shouldRejectLoginWithInvalidPassword() {
        UserEntity user = new UserEntity();
        user.setEmail("leitor@teste.com");
        user.setPasswordHash(passwordEncoder.encode("senhaCorreta123"));

        when(userRepository.findByEmailOrUsername("leitor@teste.com")).thenReturn(Optional.of(user));

        LoginRequestDto dto = new LoginRequestDto("leitor@teste.com", "senhaErrada");

        SecurityException ex = assertThrows(SecurityException.class, () ->
                authService.login(dto)
        );
        assertEquals("Credenciais inválidas", ex.getMessage());
    }

    @Test
    void shouldRejectInvalidGoogleTokenBeforeLookingUpOrCreatingAnAccount() {
        SecurityException exception = assertThrows(SecurityException.class,
                () -> authService.loginWithGoogle(new GoogleLoginRequestDto("not-a-valid-id-token")));

        assertEquals("Token Google inválido", exception.getMessage());
        verifyNoInteractions(userRepository, creatorRepository);
        assertTrue(devOutboxRepository.findLatest("victima@teste.com").isEmpty());
    }

    @Test
    void shouldCompleteFullAuthFlowViaDevOutboxAndSetHttpOnlyCookie() {
        UUID userId = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(userId);
        user.setName("Escritor Will");
        user.setEmail("will@teste.com");
        user.setCreator(true);
        user.setOwner(true);
        user.setPasswordHash(passwordEncoder.encode("minhaSenha123"));
        assertNull(user.getEmailVerifiedAt(), "the account is not verified before completing its email OTP");

        when(userRepository.findByEmailOrUsername("will@teste.com")).thenReturn(Optional.of(user));
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
        assertTrue(sessionDto.isOwner(), "owner role must travel through the authenticated session DTO");
        assertNotNull(user.getEmailVerifiedAt(), "successful LOGIN OTP must persist mailbox verification");

        // Cookie de sessão HttpOnly emitido
        var cookie = response.getCookie(SessionService.SESSION_COOKIE_NAME);
        assertNotNull(cookie);
        assertTrue(cookie.isHttpOnly());
        assertNotNull(cookie.getValue());
    }

    @Test
    void shouldReject2FaBypassWithInvalidCode() {
        twoFactorAuthService.generateAndSendOtp(
                "alvo@teste.com", "alvo@teste.com", TwoFactorAuthService.OtpPurpose.LOGIN);

        MockHttpServletResponse response = new MockHttpServletResponse();
        SecurityException ex = assertThrows(SecurityException.class, () ->
                authService.verify2Fa(new Verify2FaRequestDto("alvo@teste.com", "000000"), response)
        );
        assertEquals("Código 2FA incorreto ou expirado", ex.getMessage());
        assertNull(response.getCookie(SessionService.SESSION_COOKIE_NAME));
    }

    @Test
    void shouldCanonicalizeEmailOnRegistrationIgnoringSpacesAndCase() {        RegisterRequestDto dto = new RegisterRequestDto("Leitor", "leitor.teste", "  Leitor.Teste@Example.COM  ", "senhaForte123!", false, null, null, true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        when(userRepository.findByEmail("leitor.teste@example.com")).thenReturn(Optional.empty());

        Map<String, Object> result = authService.register(dto);
        assertEquals("2FA_REQUIRED", result.get("status"));

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).save(captor.capture());
        assertEquals("leitor.teste@example.com", captor.getValue().getEmail());

        // O OTP tem de sair para o endereço canônico, senão o código nunca chega.
        assertTrue(devOutboxRepository.findLatest("leitor.teste@example.com").isPresent());
    }

    @Test
    void shouldCanonicalizeEmailOnLoginAndRejectAddressWithInnerSpaces() {
        UserEntity user = new UserEntity();
        user.setEmail("leitor.teste@example.com");
        user.setPasswordHash(passwordEncoder.encode("senhaForte123!"));
        user.setEmailVerifiedAt(java.time.LocalDateTime.now());
        user.setName("Leitor");

        when(userRepository.findByEmailOrUsername("leitor.teste@example.com")).thenReturn(Optional.of(user));

        Map<String, Object> result = authService.login(
                new LoginRequestDto(" LEITOR.TESTE@Example.com ", "senhaForte123!"));
        assertEquals("2FA_REQUIRED", result.get("status"));

        // Identificador com espaço interno não casa com nenhuma conta: a resposta é a mesma
        // de credencial inválida (não revela se a conta existe).
        SecurityException invalid = assertThrows(SecurityException.class, () ->
                authService.login(new LoginRequestDto("leitor teste@example.com", "senhaForte123!")));
        assertEquals("Credenciais inválidas", invalid.getMessage());
    }

    @Test
    void resendsOtpWhenRegistrationWasLeftPending() {
        // Cadastro interrompido: conta existe, e-mail ainda não confirmado.
        UserEntity pending = new UserEntity();
        pending.setEmail("pendente@teste.com");
        pending.setPasswordHash(passwordEncoder.encode("senhaForte123!"));
        pending.setEmailVerifiedAt(null);

        when(userRepository.findByEmail("pendente@teste.com")).thenReturn(Optional.of(pending));

        RegisterRequestDto dto = new RegisterRequestDto("Pendente", "pendente", "  PENDENTE@Teste.com ", "senhaForte123!", false, null, null, true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        Map<String, Object> result = authService.register(dto);

        assertEquals("2FA_REQUIRED", result.get("status"));
        assertEquals("pendente@teste.com", result.get("email"));
        // O código tem de sair para o e-mail real configurado, senão o cadastro não concludes.
        assertTrue(devOutboxRepository.findLatest("pendente@teste.com").isPresent());
        verify(userRepository, never()).save(any());
    }

    @Test
    void doesNotSendOtpOnRegistrationForAlreadyConfirmedAccount() {
        // Conta já confirmada: não é cadastro, é login. Não enviamos e-mail (evita spamming
        // e mantém a resposta idêntica para não enumerar contas existentes).
        UserEntity confirmed = new UserEntity();
        confirmed.setEmail("confirmada@teste.com");
        confirmed.setPasswordHash(passwordEncoder.encode("senhaForte123!"));
        confirmed.setEmailVerifiedAt(java.time.LocalDateTime.now());

        when(userRepository.findByEmail("confirmada@teste.com")).thenReturn(Optional.of(confirmed));

        RegisterRequestDto dto = new RegisterRequestDto("Confirmada", "confirmada", "confirmada@teste.com", "senhaForte123!", false, null, null, true, null, null, null, null, true, "2026-10-v1", java.time.LocalDate.of(1990, 1, 1));

        Map<String, Object> result = authService.register(dto);

        assertEquals("2FA_REQUIRED", result.get("status"));
        assertTrue(devOutboxRepository.findLatest("confirmada@teste.com").isEmpty());
        verify(userRepository, never()).save(any());
    }
}
