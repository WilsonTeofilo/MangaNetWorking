package com.manganetworking.service.email;

import com.manganetworking.config.observability.SecurityObservabilityMetrics;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

/**
 * Registro de eventos de entrega de e-mail e lista de supressão (item 46 do roadmap).
 * <p>
 * O provedor de e-mail (SMTP autenticado) devolve bounce e complaint de forma assíncrona.
 * O webhook do provedor chama a API, o evento é gravado de forma append-only e o endereço
 * passa a ser suprimido: novos e-mails de segurança (OTP, recuperação) para esse endereço
 * deixam de ser enviados, o que protege a reputação do domínio e evita loop de bounce.
 * </p>
 * <p>
 * O endereço nunca é gravado em claro: usa-se SHA-256 do e-mail normalizado.
 * </p>
 */
@Service
public class EmailSuppressionService {

    private static final Logger log = LoggerFactory.getLogger(EmailSuppressionService.class);

    /** Eventos que bloqueiam novos envios para o endereço. */
    private static final List<String> SUPPRESSING_EVENTS = List.of("bounce", "complaint");

    private final JdbcTemplate jdbcTemplate;
    private final SecurityObservabilityMetrics metrics;

    public EmailSuppressionService(JdbcTemplate jdbcTemplate, SecurityObservabilityMetrics metrics) {
        this.jdbcTemplate = jdbcTemplate;
        this.metrics = metrics;
    }

    /**
     * Registra um evento de entrega.
     *
     * @param email      endereço afetado (normalizado e não gravado em claro)
     * @param eventType  {@code bounce}, {@code complaint} ou {@code delivery}
     * @param reason     motivo informado pelo provedor
     * @param provider   provedor de e-mail
     * @param occurredAt instante do evento
     */
    @Transactional
    public void record(String email, String eventType, String reason, String provider, Instant occurredAt) {
        String normalized = normalize(email);
        if (normalized == null) {
            throw new IllegalArgumentException("E-mail inválido para registro de evento de entrega.");
        }
        String type = eventType == null ? "bounce" : eventType.trim().toLowerCase(Locale.ROOT);
        jdbcTemplate.update("""
                INSERT INTO email_delivery_events (email_hash, event_type, reason, provider, occurred_at)
                VALUES (?, ?, ?, ?, ?)
                """, hash(normalized), type, truncate(reason, 120), truncate(provider, 40),
                occurredAt == null ? java.sql.Timestamp.from(Instant.now()) : java.sql.Timestamp.from(occurredAt));
        metrics.recordEmailBounce(type);
        log.atWarn().addKeyValue("event", "email_delivery_event")
                .addKeyValue("event_type", type)
                .addKeyValue("provider", provider == null ? "desconhecido" : provider)
                .log("Evento de entrega de e-mail registrado");
    }

    /** {@code true} quando o endereço está suprimido (bounce duro ou complaint). */
    public boolean isSuppressed(String email) {
        String normalized = normalize(email);
        if (normalized == null) {
            return false;
        }
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM email_delivery_events
                WHERE email_hash = ? AND event_type = ANY (?)
                """, Integer.class, hash(normalized), SUPPRESSING_EVENTS.toArray(new String[0]));
        return count != null && count > 0;
    }

    /** Total de eventos de bounce/complaint nos últimos minutos (usado em regra de alerta). */
    public int countSuppressingEventsSince(Instant since) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT COUNT(*) FROM email_delivery_events
                WHERE event_type = ANY (?) AND occurred_at >= ?
                """, Integer.class, SUPPRESSING_EVENTS.toArray(new String[0]), java.sql.Timestamp.from(since));
        return count == null ? 0 : count;
    }

    private String normalize(String email) {
        if (email == null) {
            return null;
        }
        String trimmed = email.trim().toLowerCase(Locale.ROOT);
        return trimmed.isEmpty() || !trimmed.contains("@") ? null : trimmed;
    }

    private String hash(String normalizedEmail) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(normalizedEmail.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
