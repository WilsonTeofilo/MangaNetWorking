package com.manganetworking.service.mfa;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

/** Redis adapter; Lua scripts make replacement and single-use verification atomic across replicas. */
@Component
@ConditionalOnProperty(name = "platform.otp.store", havingValue = "redis")
public class RedisOtpChallengeStore implements OtpChallengeStore {

    private static final long TTL_SECONDS = 300;
    private static final String SAVE_SCRIPT_TEXT = "redis.call('SET', KEYS[1], ARGV[1]..'|'..ARGV[2]..'|'..ARGV[3]..'|0', 'EX', ARGV[4]); return 1";
    private static final String VERIFY_SCRIPT_TEXT = """
            local value = redis.call('GET', KEYS[1])
            if not value then return 0 end
            local hash, purpose, expires, attempts = string.match(value, '^([^|]+)|([^|]+)|(%d+)|(%d+)$')
            if not hash then redis.call('DEL', KEYS[1]); return 0 end
            if tonumber(ARGV[3]) >= tonumber(expires) then redis.call('DEL', KEYS[1]); return 0 end
            if tonumber(attempts) >= 5 then redis.call('DEL', KEYS[1]); return -2 end
            if hash == ARGV[1] and purpose == ARGV[2] then redis.call('DEL', KEYS[1]); return 1 end
            redis.call('SET', KEYS[1], hash..'|'..purpose..'|'..expires..'|'..(tonumber(attempts) + 1), 'KEEPTTL')
            return -1
            """;
    private static final DefaultRedisScript<Long> SAVE_SCRIPT = new DefaultRedisScript<>(SAVE_SCRIPT_TEXT, Long.class);
    private static final DefaultRedisScript<Long> VERIFY_SCRIPT = new DefaultRedisScript<>(VERIFY_SCRIPT_TEXT, Long.class);

    private final StringRedisTemplate redis;
    private final String keyPrefix;

    public RedisOtpChallengeStore(StringRedisTemplate redis,
                                  @Value("${platform.otp.key-prefix:mn:otp:challenge:}") String keyPrefix) {
        this.redis = redis;
        this.keyPrefix = keyPrefix;
    }

    @Override
    public void save(String identifier, String codeHmac, String purpose, long expiresAtEpochMillis) {
        long ttl = Math.max(1, (expiresAtEpochMillis - System.currentTimeMillis() + 999) / 1000);
        redis.execute(SAVE_SCRIPT, List.of(key(identifier)), codeHmac, purpose,
                Long.toString(expiresAtEpochMillis), Long.toString(Math.min(TTL_SECONDS, ttl)));
    }

    @Override
    public VerificationResult verify(String identifier, String candidateHmac, String expectedPurpose, long now) {
        Long result = redis.execute(VERIFY_SCRIPT, List.of(key(identifier)), candidateHmac,
                expectedPurpose, Long.toString(now));
        if (Long.valueOf(1).equals(result)) return VerificationResult.VALID;
        if (Long.valueOf(-2).equals(result)) return VerificationResult.LOCKED;
        return Long.valueOf(-1).equals(result) ? VerificationResult.INVALID : VerificationResult.MISSING_OR_EXPIRED;
    }

    @Override
    public int attempts(String identifier) {
        String value = redis.opsForValue().get(key(identifier));
        if (value == null) return 0;
        int lastSeparator = value.lastIndexOf('|');
        try {
            return Integer.parseInt(value.substring(lastSeparator + 1));
        } catch (RuntimeException malformed) {
            redis.delete(key(identifier));
            return 0;
        }
    }

    @Override
    public void invalidate(String identifier) {
        redis.delete(key(identifier));
    }

    private String key(String identifier) {
        try {
            return keyPrefix + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(identifier.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 indisponível.", impossible);
        }
    }
}
