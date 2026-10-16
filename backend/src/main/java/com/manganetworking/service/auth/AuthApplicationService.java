package com.manganetworking.service.auth;

import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.auth.dto.*;
import com.manganetworking.service.session.SessionService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthApplicationService {

    private final UserRepository userRepository;
    private final CreatorRepository creatorRepository;
    private final TwoFactorAuthService twoFactorAuthService;
    private final SessionService sessionService;
    private final PasswordEncoder passwordEncoder;

    public AuthApplicationService(
            UserRepository userRepository,
            CreatorRepository creatorRepository,
            TwoFactorAuthService twoFactorAuthService,
            SessionService sessionService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.creatorRepository = creatorRepository;
        this.twoFactorAuthService = twoFactorAuthService;
        this.sessionService = sessionService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public Map<String, Object> register(RegisterRequestDto dto) {
        String normalizedEmail = dto.email().trim().toLowerCase();
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("E-mail já cadastrado na plataforma");
        }

        UserEntity user = new UserEntity();
        user.setEmail(normalizedEmail);
        user.setName(dto.name().trim());
        user.setCreator(dto.isCreator());
        user.setProfilePublic(dto.isProfilePublic() != null ? dto.isProfilePublic() : true);
        user.setPasswordHash(passwordEncoder.encode(dto.password()));
        user.setTwoFactorEnabled(true);
        userRepository.save(user);

        if (dto.isCreator()) {
            CreatorEntity creator = new CreatorEntity();
            creator.setUser(user);
            creator.setHandle(dto.handle() != null && !dto.handle().isBlank()
                    ? dto.handle().replace("@", "").trim()
                    : "autor_" + UUID.randomUUID().toString().substring(0, 6));
            creator.setBio("Novo escritor na MangaNetWorking.");
            creator.setDocumentCpf(dto.cpf() != null ? dto.cpf() : "000.000.000-00");
            creator.setPixKey(normalizedEmail);
            creator.setPixKeyType(PixKeyType.EMAIL);
            creator.setMonetizationLevel(0);
            creatorRepository.save(creator);
        }

        // Dispara desafio 2FA obrigatório
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail());

        return Map.of(
                "status", "2FA_REQUIRED",
                "message", "Cadastro criado. Digite o código de 6 dígitos enviado para seu e-mail.",
                "email", user.getEmail()
        );
    }

    public Map<String, Object> login(LoginRequestDto dto) {
        String normalizedEmail = dto.email().trim().toLowerCase();
        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElse(null);

        if (user == null || user.getPasswordHash() == null || !passwordEncoder.matches(dto.password(), user.getPasswordHash())) {
            throw new SecurityException("Credenciais inválidas");
        }

        // 2FA Obrigatório: Envia código para a outbox/canal seguro
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail());

        return Map.of(
                "status", "2FA_REQUIRED",
                "message", "Código 2FA enviado. Confirme para acessar.",
                "email", user.getEmail()
        );
    }

    @Transactional
    public Map<String, Object> loginWithGoogle(GoogleLoginRequestDto dto) {
        String normalizedEmail = dto.email().trim().toLowerCase();
        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElseGet(() -> {
                    UserEntity newUser = new UserEntity();
                    newUser.setEmail(normalizedEmail);
                    newUser.setName(dto.name() != null ? dto.name() : "Leitor Google");
                    newUser.setAvatarUrl(dto.avatarUrl());
                    newUser.setCreator(false);
                    newUser.setTwoFactorEnabled(true);
                    return userRepository.save(newUser);
                });

        // 2FA Obrigatório estilo Epic Games mesmo para login Google
        twoFactorAuthService.generateAndSendOtp(user.getEmail(), user.getEmail());

        return Map.of(
                "status", "2FA_REQUIRED",
                "message", "Autenticado via Google. Digite o código 2FA enviado para seu e-mail para desbloquear.",
                "email", user.getEmail()
        );
    }

    public AuthSessionResponseDto verify2Fa(Verify2FaRequestDto dto, HttpServletResponse response) {
        String normalizedEmail = dto.email().trim().toLowerCase();
        boolean valid = twoFactorAuthService.verifyOtp(normalizedEmail, dto.code());
        if (!valid) {
            throw new SecurityException("Código 2FA incorreto ou expirado");
        }

        UserEntity user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado"));

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
                user.isModerator()
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

    private String extractSessionId(HttpServletRequest request) {
        if (request == null || request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> SessionService.SESSION_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
