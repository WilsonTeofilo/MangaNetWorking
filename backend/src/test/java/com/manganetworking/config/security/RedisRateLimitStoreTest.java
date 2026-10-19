package com.manganetworking.config.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisRateLimitStoreTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private RedisRateLimitStore rateLimitStore;

    @BeforeEach
    void setUp() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        rateLimitStore = new RedisRateLimitStore(redisTemplate);
    }

    @Test
    @DisplayName("Deve incrementar contador e definir TTL no primeiro acesso do bucket de minuto")
    void shouldIncrementAndSetTtlOnFirstHit() {
        String key = "127.0.0.1:auth";
        long minute = 28000000L;
        String expectedRedisKey = "mn:ratelimit:127.0.0.1:auth:28000000";

        when(valueOperations.increment(expectedRedisKey, 1)).thenReturn(1L);

        int count = rateLimitStore.incrementAndGet(key, minute);

        assertThat(count).isEqualTo(1);
        verify(redisTemplate).expire(eq(expectedRedisKey), eq(Duration.ofSeconds(120)));
    }

    @Test
    @DisplayName("Não deve redefinir TTL em acessos subsequentes do mesmo bucket")
    void shouldNotResetTtlOnSubsequentHits() {
        String key = "127.0.0.1:auth";
        long minute = 28000000L;
        String expectedRedisKey = "mn:ratelimit:127.0.0.1:auth:28000000";

        when(valueOperations.increment(expectedRedisKey, 1)).thenReturn(5L);

        int count = rateLimitStore.incrementAndGet(key, minute);

        assertThat(count).isEqualTo(5);
        verify(redisTemplate, never()).expire(eq(expectedRedisKey), any(Duration.class));
    }
}
