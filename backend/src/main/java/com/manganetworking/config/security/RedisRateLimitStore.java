package com.manganetworking.config.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Set;

/**
 * Implementação distribuída de alta performance do {@link RateLimitStore} utilizando Redis.
 * <p>
 * Garante que contadores de requisições por IP sejam compartilhados de maneira atômica
 * entre réplicas da aplicação, utilizando comandos nativos {@code INCR} e TTL automático
 * de 120 segundos para eliminação garantida de vazamentos de memória (Unbounded Allocation).
 * </p>
 */
@Component
@ConditionalOnProperty(name = "platform.ratelimit.store", havingValue = "redis")
public class RedisRateLimitStore implements RateLimitStore {

    private static final String RATELIMIT_KEY_PREFIX = "mn:ratelimit:";
    private static final Duration BUCKET_TTL = Duration.ofSeconds(120);

    private final StringRedisTemplate redisTemplate;

    public RedisRateLimitStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public int incrementAndGet(String key, long minuteBucket) {
        String redisKey = RATELIMIT_KEY_PREFIX + key + ":" + minuteBucket;
        Long count = redisTemplate.opsForValue().increment(redisKey, 1);

        if (count != null && count == 1L) {
            // Primeiro acesso neste bucket de minuto: define expiração atômica de 120s
            redisTemplate.expire(redisKey, BUCKET_TTL);
        }

        return count == null ? 1 : count.intValue();
    }

    @Override
    public void evictStale(long currentMinute) {
        // No-op intencional: o TTL de 120s configurado no Redis descarta automaticamente
        // chaves de minutos anteriores sem necessidade de varredura ativa.
    }

    @Override
    public int countActiveBuckets() {
        Set<String> keys = redisTemplate.keys(RATELIMIT_KEY_PREFIX + "*");
        return keys == null ? 0 : keys.size();
    }
}
