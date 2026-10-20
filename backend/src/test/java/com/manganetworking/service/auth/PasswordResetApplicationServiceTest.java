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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PasswordResetApplicationServiceTest {
    @Mock UserRepository users;
    @Mock PasswordResetTokenRepository tokens;
    @Mock OtpIssuanceLimiter limiter;
    @Mock MfaNotificationSender sender;
    @Mock SessionService sessions;
    @Mock TwoFactorAuthService twoFactor;

    BCryptPasswordEncoder encoder;
    PasswordResetApplicationService service;
    Clock clock;

    @BeforeEach
    void setUp() {
        encoder = new BCryptPasswordEncoder(4);
        clock = Clock.fixed(Instant.parse("2026-10-19T12:00:00Z"), ZoneOffset.UTC);
        service = new PasswordResetApplicationService(users, tokens, encoder, limiter, sender,
                sessions, twoFactor, "https://app.example.invalid", Duration.ofMinutes(30), clock);
    }

    @Test
    void configurationRejectsNonHttpsPublicOriginsAndUnsafeTokenLifetimes() {
        assertThrows(IllegalStateException.class, () -> new PasswordResetApplicationService(users, tokens, encoder,
                limiter, sender, sessions, twoFactor, "http://app.example.invalid", Duration.ofMinutes(30), clock));
        assertThrows(IllegalStateException.class, () -> new PasswordResetApplicationService(users, tokens, encoder,
                limiter, sender, sessions, twoFactor, "https://app.example.invalid", Duration.ofMinutes(4), clock));
        assertThrows(IllegalStateException.class, () -> new PasswordResetApplicationService(users, tokens, encoder,
                limiter, sender, sessions, twoFactor, "https://app.example.invalid/app", Duration.ofMinutes(30), clock));
        assertThrows(IllegalStateException.class, () -> new PasswordResetApplicationService(users, tokens, encoder,
                limiter, sender, sessions, twoFactor, "https://app.example.invalid/?next=1", Duration.ofMinutes(30), clock));
    }

    @Test
    void requestIsGenericAndPersistsOnlyHash() throws Exception {
        when(limiter.tryAcquire(anyString(), anyString(), anyString())).thenReturn(true);
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("reader@example.com");
        when(users.findByEmail("reader@example.com")).thenReturn(Optional.of(user));
        ArgumentCaptor<PasswordResetTokenEntity> persisted = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);

        Map<String, String> response = service.request(new PasswordResetRequestDto(" Reader@Example.com "), new MockHttpServletRequest());

        assertEquals("REQUEST_ACCEPTED", response.get("status"));
        assertFalse(response.toString().contains("token"));
        verify(tokens).deleteForUser(user.getId());
        verify(tokens).saveAndFlush(persisted.capture());
        assertEquals(64, persisted.getValue().getTokenHash().length());
        assertEquals(LocalDateTime.of(2026, 10, 19, 12, 30), persisted.getValue().getExpiresAt());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(sender).sendPasswordResetLink(eq(user.getEmail()), link.capture(), eq(30L));
        assertTrue(link.getValue().startsWith("https://app.example.invalid/reset-password#token="));
        assertFalse(link.getValue().endsWith(persisted.getValue().getTokenHash()));
        String raw = link.getValue().substring(link.getValue().indexOf("#token=") + 7);
        String expectedHash = java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(raw.getBytes(StandardCharsets.UTF_8)));
        assertEquals(expectedHash, persisted.getValue().getTokenHash());
    }

    @Test
    void unknownAccountGetsSameResponseWithoutEmail() {
        when(limiter.tryAcquire(anyString(), anyString(), anyString())).thenReturn(true);
        when(users.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        Map<String, String> response = service.request(new PasswordResetRequestDto("missing@example.com"), new MockHttpServletRequest());
        assertEquals("Se o e-mail estiver cadastrado, enviaremos instruções para recuperar a senha.", response.get("message"));
        verify(sender, never()).sendPasswordResetLink(anyString(), anyString(), anyLong());
    }

    @Test
    void throttledRequestIsStillGenericAndDoesNotLookUpAccount() {
        when(limiter.tryAcquire(anyString(), anyString(), anyString())).thenReturn(false);
        Map<String, String> response = service.request(new PasswordResetRequestDto("reader@example.com"), new MockHttpServletRequest());
        assertEquals("REQUEST_ACCEPTED", response.get("status"));
        verifyNoInteractions(users, sender);
    }

    @Test
    void mailFailureIsGenericAndKeepsTheRequestAccepted() {
        when(limiter.tryAcquire(anyString(), anyString(), anyString())).thenReturn(true);
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("reader@example.com");
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        doThrow(new IllegalStateException("smtp unavailable"))
                .when(sender).sendPasswordResetLink(eq(user.getEmail()), anyString(), anyLong());

        Map<String, String> response = service.request(new PasswordResetRequestDto(user.getEmail()), new MockHttpServletRequest());

        assertEquals("REQUEST_ACCEPTED", response.get("status"));
        // The rotation delete happens before persisting the new token; a mail failure must not
        // expose SMTP details or roll back the already committed request.
        verify(tokens).deleteForUser(user.getId());
        verify(tokens).saveAndFlush(any(PasswordResetTokenEntity.class));
        assertFalse(response.toString().contains("smtp"));
    }

    @Test
    void emailIsSentOnlyAfterCommit() {
        when(limiter.tryAcquire(anyString(), anyString(), anyString())).thenReturn(true);
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("reader@example.com");
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));

        TransactionSynchronizationManager.initSynchronization();
        try {
            service.request(new PasswordResetRequestDto(user.getEmail()), new MockHttpServletRequest());
            verify(sender, never()).sendPasswordResetLink(anyString(), anyString(), anyLong());

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit);
            verify(sender).sendPasswordResetLink(eq(user.getEmail()), anyString(), eq(30L));
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void oversizedTokenIsRejectedBeforeRepositoryLookup() {
        String oversized = "x".repeat(129);
        assertThrows(SecurityException.class,
                () -> service.confirm(new PasswordResetConfirmDto(oversized, "New secure phrase 2026!")));
        verify(tokens, never()).findByTokenHashForUpdate(anyString());
    }

    @Test
    void validTokenChangesOnlyPasswordAndRevokesSessionsAndOtp() {
        UUID id = UUID.randomUUID();
        UserEntity user = new UserEntity();
        user.setId(id);
        user.setEmail("reader@example.com");
        user.setName("Reader");
        user.setEmailVerifiedAt(null);
        user.setPasswordHash(encoder.encode("Old passphrase 2025!"));
        when(tokens.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(
                new PasswordResetTokenEntity(id, "hash", LocalDateTime.of(2026, 10, 19, 12, 5))), Optional.empty());
        when(users.findByIdForUpdate(id)).thenReturn(Optional.of(user));

        service.confirm(new PasswordResetConfirmDto("raw-token", "New secure phrase 2026!"));

        assertTrue(encoder.matches("New secure phrase 2026!", user.getPasswordHash()));
        assertNull(user.getEmailVerifiedAt());
        assertEquals("reader@example.com", user.getEmail());
        verify(tokens).deleteForUser(id);
        verify(sessions).revokeSessionsForUser(id);
        verify(twoFactor).invalidateChallenge(user.getEmail());
        assertThrows(SecurityException.class,
                () -> service.confirm(new PasswordResetConfirmDto("raw-token", "New secure phrase 2026!")));
    }

    @Test
    void weakPasswordIsRejectedBeforeTokenConsumption() {
        assertThrows(IllegalArgumentException.class,
                () -> service.confirm(new PasswordResetConfirmDto("raw-token", "password")));
        verify(tokens, never()).findByTokenHashForUpdate(anyString());
    }

    @Test
    void expiredTokenIsRejected() {
        UUID id = UUID.randomUUID();
        when(tokens.findByTokenHashForUpdate(anyString())).thenReturn(Optional.of(
                new PasswordResetTokenEntity(id, "hash", LocalDateTime.of(2026, 10, 19, 11, 59, 59))));
        assertThrows(SecurityException.class,
                () -> service.confirm(new PasswordResetConfirmDto("raw-token", "New secure phrase 2026!")));
        verify(users, never()).findByIdForUpdate(any());
    }
}
