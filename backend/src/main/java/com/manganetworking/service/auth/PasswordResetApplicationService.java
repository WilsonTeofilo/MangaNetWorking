package com.manganetworking.service.auth;

import com.manganetworking.domain.relational.PasswordResetTokenEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.PasswordResetTokenRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.auth.dto.PasswordResetConfirmDto;
import com.manganetworking.service.auth.dto.PasswordResetRequestDto;
import com.manganetworking.service.mfa.MfaNotificationSender;
import com.manganetworking.service.mfa.OtpIssuanceLimiter;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.session.SessionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.net.URI;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Map;

@Service
public class PasswordResetApplicationService {
    private static final Duration MIN_TOKEN_TTL = Duration.ofMinutes(5);
    private static final Duration MAX_TOKEN_TTL = Duration.ofMinutes(60);
    private static final String PUBLIC_MESSAGE = "Se o e-mail estiver cadastrado, enviaremos instruções para recuperar a senha.";

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final OtpIssuanceLimiter limiter;
    private final MfaNotificationSender notificationSender;
    private final SessionService sessions;
    private final TwoFactorAuthService twoFactorAuthService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final String frontendUrl;
    private final Duration tokenTtl;
    private final Clock clock;

    public PasswordResetApplicationService(UserRepository users, PasswordResetTokenRepository tokens,
            PasswordEncoder passwordEncoder, OtpIssuanceLimiter limiter, MfaNotificationSender notificationSender,
            SessionService sessions, TwoFactorAuthService twoFactorAuthService,
            @Value("${platform.password-reset.frontend-url}") String frontendUrl,
            @Value("${platform.password-reset.token-ttl:PT30M}") Duration tokenTtl,
            Clock clock) {
        if (tokenTtl == null || tokenTtl.compareTo(MIN_TOKEN_TTL) < 0 || tokenTtl.compareTo(MAX_TOKEN_TTL) > 0) {
            throw new IllegalStateException("platform.password-reset.token-ttl deve estar entre PT5M e PT1H.");
        }
        this.users = users;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.limiter = limiter;
        this.notificationSender = notificationSender;
        this.sessions = sessions;
        this.twoFactorAuthService = twoFactorAuthService;
        this.frontendUrl = validateFrontendUrl(frontendUrl);
        this.tokenTtl = tokenTtl;
        this.clock = clock;
    }

    @Transactional
    public Map<String, String> request(PasswordResetRequestDto dto, HttpServletRequest request) {
        String email = dto.email().trim().toLowerCase(Locale.ROOT);
        // Rate limiting applies identically before account lookup to avoid an existence oracle.
        if (!limiter.tryAcquire(email, request == null ? "unknown" : request.getRemoteAddr())) {
            return accepted();
        }
        UserEntity user = users.findByEmail(email).orElse(null);
        if (user == null) return accepted();

        LocalDateTime now = LocalDateTime.now(clock);
        tokens.deleteExpired(now);
        if (tokens.existsById(user.getId())) return accepted();

        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String hash = hash(rawToken);
        tokens.saveAndFlush(new PasswordResetTokenEntity(user.getId(), hash, now.plus(tokenTtl)));
        String link = frontendUrl + "/reset-password#token=" + rawToken;
        try {
            notificationSender.sendPasswordResetLink(user.getEmail(), link, tokenTtl.toMinutes());
        } catch (RuntimeException exception) {
            tokens.deleteForUser(user.getId());
            // Keep the public response generic; the adapter logs only operational metadata.
        }
        return accepted();
    }

    @Transactional
    public void confirm(PasswordResetConfirmDto dto) {
        PasswordPolicy.validateNewPassword(dto.newPassword());
        String token = dto.token().trim();
        if (token.length() > 128) throw invalidToken();
        PasswordResetTokenEntity tokenEntity = tokens.findByTokenHashForUpdate(hash(token)).orElseThrow(this::invalidToken);
        LocalDateTime now = LocalDateTime.now(clock);
        if (!tokenEntity.getExpiresAt().isAfter(now)) {
            tokens.delete(tokenEntity);
            throw invalidToken();
        }
        UserEntity user = users.findByIdForUpdate(tokenEntity.getUserId()).orElseThrow(this::invalidToken);
        user.setPasswordHash(passwordEncoder.encode(dto.newPassword()));
        users.save(user);
        tokens.delete(tokenEntity);
        tokens.deleteForUser(user.getId());
        sessions.revokeSessionsForUser(user.getId());
        twoFactorAuthService.invalidateChallenge(user.getEmail());
    }

    private Map<String, String> accepted() {
        return Map.of("status", "REQUEST_ACCEPTED", "message", PUBLIC_MESSAGE);
    }

    private String validateFrontendUrl(String value) {
        try {
            URI uri = URI.create(value).normalize();
            String scheme = uri.getScheme();
            String host = uri.getHost();
            boolean localHttp = "http".equalsIgnoreCase(scheme)
                    && ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host));
            if (host == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                    || !("https".equalsIgnoreCase(scheme) || localHttp)) {
                throw new IllegalArgumentException("URL pública de recuperação inválida.");
            }
            return value.replaceAll("/+$", "");
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("platform.password-reset.frontend-url deve ser HTTPS (HTTP só em localhost).", exception);
        }
    }

    private SecurityException invalidToken() {
        return new SecurityException("Link inválido ou expirado. Solicite uma nova recuperação de senha.");
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("Não foi possível processar a solicitação de segurança.", exception);
        }
    }
}
