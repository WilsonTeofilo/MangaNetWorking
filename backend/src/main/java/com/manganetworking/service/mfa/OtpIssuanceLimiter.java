package com.manganetworking.service.mfa;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Shared account/IP throttle for sensitive issuance flows. Redis mode is atomic across replicas.
 * Each namespace has an independent cooldown/window, so password recovery cannot consume the
 * login OTP quota (and vice versa).
 */
@Component
public class OtpIssuanceLimiter {

    public static final String OTP_NAMESPACE = "otp";
    public static final String PASSWORD_RESET_NAMESPACE = "password-reset";
    private static final Pattern NAMESPACE_PATTERN = Pattern.compile("[a-z0-9-]{1,32}");
    private static final long COOLDOWN_MILLIS = 60_000;
    private static final long WINDOW_MILLIS = 600_000;
    private static final int MAX_ISSUANCES = 3;
    private static final String REDIS_SCRIPT = """
            local now = tonumber(ARGV[1])
            local token = ARGV[2]
            local windowStart = now - 600000
            for i = 1, 2 do
              redis.call('ZREMRANGEBYSCORE', KEYS[i], '-inf', windowStart)
            end
            for i = 1, 2 do
              local latest = redis.call('ZREVRANGE', KEYS[i], 0, 0, 'WITHSCORES')
              if #latest > 0 and now - tonumber(latest[2]) < 60000 then return 0 end
              if redis.call('ZCARD', KEYS[i]) >= 3 then return 0 end
            end
            for i = 1, 2 do
              redis.call('ZADD', KEYS[i], now, token)
              redis.call('EXPIRE', KEYS[i], 660)
            end
            return 1
            """;

    private static final DefaultRedisScript<Long> REDIS_ACQUIRE_SCRIPT = new DefaultRedisScript<>(REDIS_SCRIPT, Long.class);

    private final StringRedisTemplate redis;
    private final boolean redisEnabled;
    private final Map<String, Deque<Long>> localWindows = new ConcurrentHashMap<>();

    public OtpIssuanceLimiter(
            StringRedisTemplate redis,
            @Value("${platform.ratelimit.store:inmemory}") String store
    ) {
        this.redis = redis;
        this.redisEnabled = "redis".equalsIgnoreCase(store);
        if (redisEnabled && redis == null) {
            throw new IllegalStateException("Redis é obrigatório para o rate limit de OTP.");
        }
    }

    public boolean tryAcquire(String accountIdentifier, String clientIp) {
        return tryAcquire(OTP_NAMESPACE, accountIdentifier, clientIp, Instant.now());
    }

    public boolean tryAcquire(String namespace, String accountIdentifier, String clientIp) {
        return tryAcquire(namespace, accountIdentifier, clientIp, Instant.now());
    }

    boolean tryAcquire(String accountIdentifier, String clientIp, Instant now) {
        return tryAcquire(OTP_NAMESPACE, accountIdentifier, clientIp, now);
    }

    boolean tryAcquire(String namespace, String accountIdentifier, String clientIp, Instant now) {
        String prefix = "mn:" + normalizeNamespace(namespace) + ":issue:";
        String accountKey = prefix + "account:" + digest(normalize(accountIdentifier));
        String ipKey = prefix + "ip:" + digest(normalize(clientIp));
        long nowMillis = now.toEpochMilli();

        if (redisEnabled) {
            Long allowed = redis.execute(REDIS_ACQUIRE_SCRIPT, List.of(accountKey, ipKey),
                    Long.toString(nowMillis), UUID.randomUUID().toString());
            return Long.valueOf(1).equals(allowed);
        }
        return tryAcquireLocally(accountKey, ipKey, nowMillis);
    }

    private synchronized boolean tryAcquireLocally(String accountKey, String ipKey, long now) {
        pruneExpired(now);
        Deque<Long> account = localWindows.computeIfAbsent(accountKey, ignored -> new ArrayDeque<>());
        Deque<Long> ip = localWindows.computeIfAbsent(ipKey, ignored -> new ArrayDeque<>());
        prune(account, now);
        prune(ip, now);
        if (isThrottled(account, now) || isThrottled(ip, now)) return false;

        account.addLast(now);
        ip.addLast(now);
        return true;
    }

    private boolean isThrottled(Deque<Long> timestamps, long now) {
        return timestamps.size() >= MAX_ISSUANCES
                || (!timestamps.isEmpty() && now - timestamps.peekLast() < COOLDOWN_MILLIS);
    }

    private void pruneExpired(long now) {
        localWindows.entrySet().removeIf(entry -> {
            prune(entry.getValue(), now);
            return entry.getValue().isEmpty();
        });
    }

    private void prune(Deque<Long> timestamps, long now) {
        while (!timestamps.isEmpty() && now - timestamps.peekFirst() >= WINDOW_MILLIS) {
            timestamps.removeFirst();
        }
    }

    private String normalizeNamespace(String namespace) {
        if (namespace == null || !NAMESPACE_PATTERN.matcher(namespace).matches()) {
            throw new IllegalArgumentException("Namespace de limitação inválido.");
        }
        return namespace;
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim().toLowerCase();
    }

    private String digest(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 indisponível.", impossible);
        }
    }
}
