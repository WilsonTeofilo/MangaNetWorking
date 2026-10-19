package com.manganetworking.service.session;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Implementação distribuída de alta escalabilidade do {@link SessionStore} utilizando Redis.
 * <p>
 * Projetada para arquiteturas multi-instância sem afinidade de nó (Stateless API).
 * Implementa:
 * <ul>
 *   <li>TTL atômico por sessão via {@code EXPIRE} nativo do Redis.</li>
 *   <li>Índice reverso por {@code userId} em Redis Set para revogação imediata em massa (LGPD Art. 18).</li>
 *   <li>Serialização JSON segura com suporte a ISO-8601 (JavaTimeModule).</li>
 * </ul>
 * </p>
 */
@Component
@ConditionalOnProperty(name = "platform.session.store", havingValue = "redis")
public class RedisSessionStore implements SessionStore {

    private static final Logger log = LoggerFactory.getLogger(RedisSessionStore.class);

    private static final String SESSION_KEY_PREFIX = "mn:session:";
    private static final String USER_SESSIONS_PREFIX = "mn:user:sessions:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public RedisSessionStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Override
    public void save(SessionService.UserSession session) {
        String sessionKey = SESSION_KEY_PREFIX + session.sessionId();
        String userSetKey = USER_SESSIONS_PREFIX + session.userId();

        try {
            String json = objectMapper.writeValueAsString(session);
            long ttlSeconds = Duration.between(Instant.now(), session.expiresAt()).getSeconds();

            if (ttlSeconds > 0) {
                redisTemplate.opsForValue().set(sessionKey, json, Duration.ofSeconds(ttlSeconds));
            } else {
                redisTemplate.opsForValue().set(sessionKey, json);
            }

            redisTemplate.opsForSet().add(userSetKey, session.sessionId());
            redisTemplate.expire(userSetKey, Duration.ofDays(30));
        } catch (JsonProcessingException e) {
            log.error("[REDIS-SESSION] Falha ao serializar sessão {}: {}", session.sessionId(), e.getMessage());
            throw new IllegalStateException("Erro ao persistir sessão no Redis", e);
        }
    }

    @Override
    public Optional<SessionService.UserSession> findById(String sessionId) {
        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        String json = redisTemplate.opsForValue().get(sessionKey);

        if (json == null || json.isBlank()) {
            return Optional.empty();
        }

        try {
            SessionService.UserSession session = objectMapper.readValue(json, SessionService.UserSession.class);
            if (session.isExpired()) {
                delete(sessionId);
                return Optional.empty();
            }
            return Optional.of(session);
        } catch (JsonProcessingException e) {
            log.error("[REDIS-SESSION] Falha ao desserializar sessão {}: {}", sessionId, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void delete(String sessionId) {
        String sessionKey = SESSION_KEY_PREFIX + sessionId;
        String json = redisTemplate.opsForValue().get(sessionKey);

        if (json != null && !json.isBlank()) {
            try {
                SessionService.UserSession session = objectMapper.readValue(json, SessionService.UserSession.class);
                String userSetKey = USER_SESSIONS_PREFIX + session.userId();
                redisTemplate.opsForSet().remove(userSetKey, sessionId);
            } catch (JsonProcessingException ignored) {
                // Melhor esforço na remoção da referência reversa
            }
        }

        redisTemplate.delete(sessionKey);
    }

    @Override
    public int removeByUserId(UUID userId) {
        String userSetKey = USER_SESSIONS_PREFIX + userId;
        Set<String> sessionIds = redisTemplate.opsForSet().members(userSetKey);

        if (sessionIds == null || sessionIds.isEmpty()) {
            redisTemplate.delete(userSetKey);
            return 0;
        }

        int removed = 0;
        for (String sessionId : sessionIds) {
            redisTemplate.delete(SESSION_KEY_PREFIX + sessionId);
            removed++;
        }

        redisTemplate.delete(userSetKey);
        return removed;
    }

    @Override
    public int removeExpired(Instant now) {
        // No Redis, o próprio TTL atômico (EXPIRE) descarta chaves expiradas.
        return 0;
    }

    @Override
    public long countActive() {
        Set<String> keys = redisTemplate.keys(SESSION_KEY_PREFIX + "*");
        return keys == null ? 0 : keys.size();
    }
}
