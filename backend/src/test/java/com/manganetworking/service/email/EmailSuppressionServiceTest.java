package com.manganetworking.service.email;

import com.manganetworking.config.observability.SecurityObservabilityMetrics;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailSuppressionServiceTest {

    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final SecurityObservabilityMetrics metrics =
            new SecurityObservabilityMetrics(new SimpleMeterRegistry());
    private final EmailSuppressionService service = new EmailSuppressionService(jdbcTemplate, metrics);

    @Test
    @DisplayName("Bounce registra o evento sem gravar o e-mail em claro")
    void recordsBounceHashed() {
        service.record("Leitor@Exemplo.Test", "BOUNCE", "mailbox not found", "smtp-provedor", Instant.now());

        verify(jdbcTemplate).update(contains("INSERT INTO email_delivery_events"), any(), any(), any(), any(), any());
        verify(jdbcTemplate).update(contains("INSERT INTO email_delivery_events"),
                eq(hashOf("leitor@exemplo.test")), eq("bounce"), eq("mailbox not found"), eq("smtp-provedor"), any());
    }

    @Test
    @DisplayName("Endereço com bounce fica suprimido")
    void suppressedAfterBounce() {
        when(jdbcTemplate.queryForObject(contains("FROM email_delivery_events"), eq(Integer.class), any(), any()))
                .thenReturn(2);

        assertTrue(service.isSuppressed("leitor@exemplo.test"));
    }

    @Test
    @DisplayName("Endereço sem bounce não fica suprimido")
    void notSuppressedWithoutEvents() {
        when(jdbcTemplate.queryForObject(contains("FROM email_delivery_events"), eq(Integer.class), any(), any()))
                .thenReturn(0);

        assertFalse(service.isSuppressed("leitor@exemplo.test"));
    }

    @Test
    @DisplayName("E-mail inválido é recusado no registro")
    void rejectsInvalidEmail() {
        assertThrows(IllegalArgumentException.class,
                () -> service.record("nao-e-email", "bounce", "x", "p", Instant.now()));
    }

    private String hashOf(String email) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            return java.util.HexFormat.of().formatHex(digest.digest(email.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
