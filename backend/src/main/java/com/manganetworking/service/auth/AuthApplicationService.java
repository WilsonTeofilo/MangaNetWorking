package com.manganetworking.service.auth;

import com.manganetworking.domain.value.SocialLinks;
import com.manganetworking.service.creator.CreatorProfileFactory;
import com.manganetworking.domain.enums.Sex;
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
import com.manganetworking.util.SocialLinkPolicy;
import com.manganetworking.util.UsernamePolicy;
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
    private final CreatorProfileFactory creatorProfileFactory;
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
            CreatorProfileFactory creatorProfileFactory,
            TwoFactorAuthService twoFactorAuthService,
            OtpIssuanceLimiter otpIssuanceLimiter,
            SessionService sessionService,
            PasswordEncoder passwordEncoder,
            PrivacyComplianceService privacyComplianceService,
            @Value("${GOOGLE_CLIENT_ID:}") String googleClientId
    ) {
        this.userRepository = userRepository;
        this.creatorRepository = creatorRepository;
        this.creatorProfileFactory = creatorProfileFactory;
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
        String normalizedUsername = UsernamePolicy.normalize(dto.username());
        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername)) {
            throw new IllegalArgumentException("Este username já está em uso.");
        }
        Optional<UserEntity> existingAccount = userRepository.findByEmail(normalizedEmail);
        if (existingAccount.isPresent()) {
            // Cadastro interrompido: a conta existe mas o e-mail nunca foi confirmado (a pessoa
            // não recebeu o código ou nunca digitou). Nesse caso reenviamos o código para concluir
            // o cadastro — o e-mail do SMTP configurado é o canal de entrega do OTP.
            // Conta já confirmada NÃO recebe e-mail aqui: esse caso é login, e a resposta
            // continua idêntica nos dois casos para não enumerar contas existentes.
            UserEntity pending = existingAccount.get();
            if (pending.getEmailVerifiedAt() == null) {
                enforceOtpIssuanceLimit(normalizedEmail, clientIp(request));
                twoFactorAuthService.generateAndSendOtp(normalizedEmail, normalizedEmail,
                        TwoFactorAuthService.OtpPurpose.LOGIN);
            }
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
        user.setUsername(normalizedUsername);
        user.setName(dto.name().trim());
        user.setSex(dto.sex() != null ? dto.sex() : Sex.NAO_INFORMADO);
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
            // Escrever exige UM vinculo social: e o que separa o perfil publico de escritor
            // do perfil de leitor. O identificador do autor e o username desta mesma conta.
            SocialLinks links = SocialLinks.of(dto.instagramUrl(), dto.youtubeUrl(), dto.portfolioUrl());
            String cpf = dto.cpf() == null || dto.cpf().isBlank() ? null : dto.cpf().replaceAll("\\D", "");
            creatorRepository.save(creatorProfileFactory.create(user, links, cpf));
        }

        // Dispara desafio 2FA obrigatório
        enforceOtpIssuanceLimit(user.getEmail(), clientIp(request));
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail(), TwoFactorAuthService.OtpPurpose.LOGIN);

        return registrationAccepted(user.getEmail());
    }

    /** Identificador de login (e-mail ou username) normalizado para a busca no servidor. */
    private String normalizeIdentifier(String identifier) {
        return identifier == null ? "" : identifier.trim().toLowerCase(java.util.Locale.ROOT);
    }

    private Map<String, Object> registrationAccepted(String email) {        return Map.of("status", "2FA_REQUIRED",
                "message", "Se os dados estiverem disponíveis, enviaremos instruções para o e-mail informado.",
                "email", email);
    }

    public Map<String, Object> login(LoginRequestDto dto) {
        return login(dto, null);
    }

    @Transactional
    public Map<String, Object> login(LoginRequestDto dto, HttpServletRequest request) {
        PasswordPolicy.validate(dto.password());
        // Segunda via de login: o identificador pode ser o e-mail ou o username.
        UserEntity user = userRepository.findByEmailOrUsername(normalizeIdentifier(dto.identifier())).orElse(null);

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
                "email", user.getEmail(),
                "username", user.getUsername() != null ? user.getUsername() : ""
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
        // O identificador pode ser e-mail ou username: o desafio é sempre do e-mail real.
        UserEntity user = userRepository.findByEmailOrUsername(normalizeIdentifier(dto.identifier()))
                .orElseThrow(() -> new SecurityException("Código 2FA incorreto ou expirado"));
        String accountEmail = user.getEmail();
        boolean valid = twoFactorAuthService.verifyOtp(accountEmail, dto.code(), TwoFactorAuthService.OtpPurpose.LOGIN);
        if (!valid) {
            throw new SecurityException("Código 2FA incorreto ou expirado");
        }
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
                user.getUsername(),
                user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                user.isCreator(),
                creator != null ? creator.getId() : null,
                creator != null ? creator.getHandle() : null,
                user.isModerator(),
                user.isOwner(),
                user.getSex() != null ? user.getSex().name() : Sex.NAO_INFORMADO.name()
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
                    user != null ? user.getUsername() : "",
                    user != null && user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                    session.isCreator(),
                    session.creatorId(),
                    session.creatorHandle(),
                    session.isModerator(),
                    session.isOwner(),
                    user != null && user.isVipActive(),
                    user != null ? user.getVipExpiresAt() : null,
                    user == null || privacyComplianceService.consentRequired(user),
                    policyVersion,
                    user != null && user.getSex() != null ? user.getSex().name() : Sex.NAO_INFORMADO.name(),
                    user == null || user.isProfilePublic(),
                    user != null && user.getProfileOnboardingCompletedAt() != null
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
