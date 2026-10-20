package com.manganetworking.service.auth;

import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.mfa.OtpIssuanceLimiter;
import com.manganetworking.service.auth.dto.*;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.user.PrivacyComplianceService;
import com.manganetworking.util.CpfValidator;
import com.manganetworking.util.EmailNormalizer;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class AuthApplicationService {

    private final UserRepository userRepository;
    private final CreatorRepository creatorRepository;
    private final TwoFactorAuthService twoFactorAuthService;
    private final OtpIssuanceLimiter otpIssuanceLimiter;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;
    private final PrivacyComplianceService privacyComplianceService;
    private final String googleClientId;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    /**
     * Hash descartável usado para manter custo de BCrypt mesmo quando o e-mail não existe
     * ou a conta é somente Google. Evita enumeração de contas por diferença de tempo.
     */
    private final String dummyPasswordHash;

    public AuthApplicationService(
            UserRepository userRepository,
            CreatorRepository creatorRepository,
            TwoFactorAuthService twoFactorAuthService,
            OtpIssuanceLimiter otpIssuanceLimiter,
            SessionService sessionService,
            PasswordEncoder passwordEncoder,
            PrivacyComplianceService privacyComplianceService,
            @Value("${GOOGLE_CLIENT_ID:}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.creatorRepository = creatorRepository;
        this.twoFactorAuthService = twoFactorAuthService;
        this.otpIssuanceLimiter = otpIssuanceLimiter;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
        this.privacyComplianceService = privacyComplianceService;
        this.googleClientId = googleClientId == null ? "" : googleClientId.trim();
        this.googleIdTokenVerifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(this.googleClientId))
                .build();
        this.dummyPasswordHash = passwordEncoder.encode("manganetworking-timing-only-not-a-credential");
    }

    @Transactional
    public Map<String, Object> register(RegisterRequestDto dto) {
        return register(dto, null);
    }

    @Transactional
    public Map<String, Object> register(RegisterRequestDto dto, HttpServletRequest request) {
        PasswordPolicy.validateNewPassword(dto.password());
        String normalizedEmail = EmailNormalizer.normalize(dto.email());
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            return registrationAccepted(normalizedEmail);
        }

        // Validação de Consentimento Legal Obrigatório (Art. 7º, I e Art. 8º da LGPD)
        if (dto.termsAccepted() == null || !dto.termsAccepted()) {
            throw new IllegalArgumentException("É obrigatório aceitar os Termos de Uso e a Política de Privacidade.");
        }
        if (!privacyComplianceService.currentPolicyVersion().equals(dto.privacyPolicyVersion())) {
            throw new IllegalArgumentException("A versão da Política de Privacidade mudou. Leia e aceite a versão atual.");
        }
        if (dto.isCreator() && dto.cpf() != null && !dto.cpf().isBlank() && !CpfValidator.isValid(dto.cpf())) {
            throw new IllegalArgumentException("O CPF informado é inválido.");
        }

        UserEntity user = new UserEntity();
        user.setEmail(normalizedEmail);
        user.setName(dto.name().trim());
        user.setCreator(dto.isCreator());
        user.setProfilePublic(dto.isProfilePublic() != null ? dto.isProfilePublic() : true);
        user.setPasswordHash(passwordEncoder.encode(dto.password()));
        user.setTwoFactorEnabled(true);
        user.setTermsAcceptedAt(java.time.LocalDateTime.now());
        user.setPrivacyPolicyVersion(privacyComplianceService.currentPolicyVersion());
        user.setBirthDate(dto.birthDate());
        userRepository.save(user);
        userRepository.flush();
        privacyComplianceService.recordConsent(user.getId(), privacyComplianceService.currentPolicyVersion(),
                "ACCOUNT_REGISTRATION", clientIp(request), request == null ? null : request.getHeader("User-Agent"));


        if (dto.isCreator()) {
            CreatorEntity creator = new CreatorEntity();
            creator.setUser(user);
            creator.setHandle(dto.handle() != null && !dto.handle().isBlank()
                    ? dto.handle().replace("@", "").trim()
                    : "autor_" + UUID.randomUUID().toString().substring(0, 6));
            creator.setBio("Novo escritor na MangaNetWorking.");
            creator.setDocumentCpf(dto.cpf() == null || dto.cpf().isBlank() ? null : dto.cpf().replaceAll("\\D", ""));
            creator.setPixKey(normalizedEmail);
            creator.setPixKeyType(PixKeyType.EMAIL);
            creator.setMonetizationLevel(0);
            creatorRepository.save(creator);
        }

        // Dispara desafio 2FA obrigatório
        enforceOtpIssuanceLimit(user.getEmail(), clientIp(request));
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail(), TwoFactorAuthService.OtpPurpose.LOGIN);

        return registrationAccepted(user.getEmail());
    }

    private Map<String, Object> registrationAccepted(String email) {
        return Map.of("status", "2FA_REQUIRED",
                "message", "Se os dados estiverem disponíveis, enviaremos instruções para o e-mail informado.",
                "email", email);
    }

    public Map<String, Object> login(LoginRequestDto dto) {
        return login(dto, null);
    }

    @Transactional
    public Map<String, Object> login(LoginRequestDto dto, HttpServletRequest request) {
        PasswordPolicy.validate(dto.password());
        String normalizedEmail = EmailNormalizer.normalize(dto.email());
        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElse(null);

        // Executa BCrypt também para conta inexistente/sem senha, reduzindo a diferença de
        // tempo entre "e-mail desconhecido" e "senha incorreta".
        String passwordHash = user == null || user.getPasswordHash() == null
                ? dummyPasswordHash
                : user.getPasswordHash();
        if (user == null || passwordHash == null || !passwordEncoder.matches(dto.password(), passwordHash)) {
            throw new SecurityException("Credenciais inválidas");
        }
        if (passwordEncoder.upgradeEncoding(user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode(dto.password()));
            userRepository.save(user);
        }

        // 2FA Obrigatório: Envia código para a outbox/canal seguro
        enforceOtpIssuanceLimit(user.getEmail(), clientIp(request));
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail(), TwoFactorAuthService.OtpPurpose.LOGIN);

        return Map.of(
                "status", "2FA_REQUIRED",
                "message", "Código 2FA enviado. Confirme para acessar.",
                "email", user.getEmail()
        );
    }

    @Transactional
    public Map<String, Object> loginWithGoogle(GoogleLoginRequestDto dto) {
        return loginWithGoogle(dto, null);
    }

    @Transactional
    public Map<String, Object> loginWithGoogle(GoogleLoginRequestDto dto, HttpServletRequest request) {
        if (googleClientId.isBlank()) {
            throw new IllegalStateException("Login Google indisponível: GOOGLE_CLIENT_ID não configurado.");
        }

        GoogleIdToken idToken;
        try {
            idToken = googleIdTokenVerifier.verify(dto.googleToken());
        } catch (GeneralSecurityException ex) {
            throw new SecurityException("Token Google inválido", ex);
        } catch (IOException ex) {
            throw new IllegalStateException("Não foi possível validar a identidade Google agora.", ex);
        } catch (IllegalArgumentException ex) {
            throw new SecurityException("Token Google inválido", ex);
        }

        if (idToken == null) {
            throw new SecurityException("Token Google inválido");
        }

        GoogleIdToken.Payload claims = idToken.getPayload();
        String email = claims.getEmail();
        String subject = claims.getSubject();
        if (!Boolean.TRUE.equals(claims.getEmailVerified())
                || email == null || email.isBlank()
                || subject == null || subject.isBlank()) {
            throw new SecurityException("Token Google inválido");
        }

        String normalizedEmail = EmailNormalizer.normalize(email);
        String verifiedName = (String) claims.get("name");
        String verifiedAvatarUrl = (String) claims.get("picture");
        UserEntity user = userRepository.findByEmail(normalizedEmail).orElse(null);
        if (user == null) {
            if (!Boolean.TRUE.equals(dto.termsAccepted())
                    || !privacyComplianceService.currentPolicyVersion().equals(dto.privacyPolicyVersion())) {
                throw new IllegalArgumentException("É necessário aceitar a versão atual dos Termos e da Política para criar a conta.");
            }
            user = new UserEntity();
            user.setEmail(normalizedEmail);
            user.setName(verifiedName != null && !verifiedName.isBlank() ? verifiedName.trim() : "Leitor Google");
            user.setAvatarUrl(verifiedAvatarUrl);
            user.setCreator(false);
            user.setTwoFactorEnabled(true);
            user.setTermsAcceptedAt(java.time.LocalDateTime.now());
            user.setPrivacyPolicyVersion(privacyComplianceService.currentPolicyVersion());
            user = userRepository.save(user);
            userRepository.flush();
            privacyComplianceService.recordConsent(user.getId(), privacyComplianceService.currentPolicyVersion(),
                    "GOOGLE_REGISTRATION", clientIp(request), request == null ? null : request.getHeader("User-Agent"));
        }
        if (user.getEmailVerifiedAt() == null) {
            // Google's verified email claim proves ownership for this login, including linked legacy accounts.
            user.setEmailVerifiedAt(java.time.LocalDateTime.now());
            userRepository.save(user);
        }

        // 2FA Obrigatório estilo Epic Games mesmo para login Google
        enforceOtpIssuanceLimit(user.getEmail(), clientIp(request));
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail(), TwoFactorAuthService.OtpPurpose.LOGIN);

        return Map.of(
                "status", "2FA_REQUIRED",
                "message", "Autenticado via Google. Digite o código 2FA enviado para seu e-mail para desbloquear.",
                "email", user.getEmail()
        );
    }

    public AuthSessionResponseDto verify2Fa(Verify2FaRequestDto dto, HttpServletResponse response) {
        String normalizedEmail = EmailNormalizer.normalize(dto.email());
        boolean valid = twoFactorAuthService.verifyOtp(normalizedEmail, dto.code(), TwoFactorAuthService.OtpPurpose.LOGIN);
        if (!valid) {
            throw new SecurityException("Código 2FA incorreto ou expirado");
        }

        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado"));
        if (user.getEmailVerifiedAt() == null) {
            // A successful LOGIN OTP is sent to the account email and proves mailbox control.
            user.setEmailVerifiedAt(java.time.LocalDateTime.now());
            userRepository.save(user);
        }

        CreatorEntity creator = creatorRepository.findByUserId(user.getId()).orElse(null);

        // Cria a sessão com cookie HttpOnly seguro
        sessionService.createSession(user, creator, response);

        return new AuthSessionResponseDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                user.isCreator(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getHandle() : null,
                user.isModerator(),
                user.isOwner()
        );
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String sessionId = extractSessionId(request);
        sessionService.revokeSession(sessionId, response);
    }

    public Optional<SessionService.UserSession> getCurrentSession(HttpServletRequest request) {
        String sessionId = extractSessionId(request);
        return sessionService.validateSession(sessionId);
    }

    /**
     * Read model de {@code GET /api/auth/me}. O controller não acessa repositório diretamente;
     * avatar, VIP e consentimento são resolvidos aqui, sempre a partir da sessão autenticada.
     */
    public Optional<CurrentSessionResponseDto> currentSession(HttpServletRequest request) {
        return getCurrentSession(request).map(session -> {
            UserEntity user = userRepository.findById(session.userId()).orElse(null);
            String policyVersion = privacyComplianceService.currentPolicyVersion();
            return new CurrentSessionResponseDto(
                    session.userId(),
                    session.name(),
                    session.email(),
                    user != null && user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                    session.isCreator(),
                    session.creatorId(),
                    session.creatorHandle(),
                    session.isModerator(),
                    session.isOwner(),
                    user != null && user.isVipActive(),
                    user != null ? user.getVipExpiresAt() : null,
                    user == null || privacyComplianceService.consentRequired(user),
                    policyVersion
            );
        });
    }

    public String currentPolicyVersion() {
        return privacyComplianceService.currentPolicyVersion();
    }

    @Transactional
    public void requestStepUpOtp(HttpServletRequest request) {
        SessionService.UserSession session = getCurrentSession(request)
                .orElseThrow(() -> new com.manganetworking.config.exception.AccessDeniedException("Sessão autenticada necessária para solicitar verificação de segurança"));
        enforceOtpIssuanceLimit(session.email(), request.getRemoteAddr());
        twoFactorAuthService.generateAndSendOtp(
                session.email(), session.email(), TwoFactorAuthService.OtpPurpose.STEP_UP_PIX);
    }

    private void enforceOtpIssuanceLimit(String account, String clientIp) {
        if (!otpIssuanceLimiter.tryAcquire(account, clientIp)) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Aguarde antes de solicitar outro código de segurança.");
        }
    }

    private String clientIp(HttpServletRequest request) {
        return request == null ? "unknown" : request.getRemoteAddr();
    }

    private String extractSessionId(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> SessionService.SESSION_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
