package com.manganetworking.integration;

import com.manganetworking.service.mfa.OtpChallengeStore;
import com.manganetworking.service.mfa.RedisOtpChallengeStore;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers(disabledWithoutDocker = true)
class RedisOtpChallengeStoreIntegrationTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
            .withExposedPorts(6379);

    private static LettuceConnectionFactory connectionFactory;
    private static RedisOtpChallengeStore store;

    @BeforeAll
    static void connectStore() {
        connectionFactory = new LettuceConnectionFactory(REDIS.getHost(), REDIS.getMappedPort(6379));
        connectionFactory.afterPropertiesSet();
        StringRedisTemplate template = new StringRedisTemplate(connectionFactory);
        template.afterPropertiesSet();
        store = new RedisOtpChallengeStore(template, "test:mn:otp:");
    }

    @AfterAll
    static void closeStore() {
        if (connectionFactory != null) connectionFactory.destroy();
    }

    @Test
    void bindsPurposeExpiresAndConsumesChallengeOnce() {
        long expiry = Instant.now().plusSeconds(30).toEpochMilli();
        store.save("reader@example.com", "a".repeat(64), "LOGIN", expiry);

        assertThat(store.verify("reader@example.com", "a".repeat(64), "STEP_UP_PIX", System.currentTimeMillis()))
                .isEqualTo(OtpChallengeStore.VerificationResult.INVALID);
        assertThat(store.verify("reader@example.com", "a".repeat(64), "LOGIN", System.currentTimeMillis()))
                .isEqualTo(OtpChallengeStore.VerificationResult.VALID);
        assertThat(store.verify("reader@example.com", "a".repeat(64), "LOGIN", System.currentTimeMillis()))
                .isEqualTo(OtpChallengeStore.VerificationResult.MISSING_OR_EXPIRED);

        store.save("expired@example.com", "b".repeat(64), "LOGIN", System.currentTimeMillis() - 1);
        assertThat(store.verify("expired@example.com", "b".repeat(64), "LOGIN", System.currentTimeMillis()))
                .isEqualTo(OtpChallengeStore.VerificationResult.MISSING_OR_EXPIRED);
    }

    @Test
    void limitsAttemptsAndConsumesChallengeAtomicallyAcrossConcurrentVerifications() throws Exception {
        long expiry = Instant.now().plusSeconds(30).toEpochMilli();
        store.save("guess@example.com", "c".repeat(64), "LOGIN", expiry);
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThat(store.verify("guess@example.com", "d".repeat(64), "LOGIN", System.currentTimeMillis()))
                    .isEqualTo(OtpChallengeStore.VerificationResult.INVALID);
        }
        assertThat(store.verify("guess@example.com", "d".repeat(64), "LOGIN", System.currentTimeMillis()))
                .isEqualTo(OtpChallengeStore.VerificationResult.LOCKED);

        store.save("race@example.com", "e".repeat(64), "STEP_UP_PIX", expiry);
        int workers = 12;
        CountDownLatch ready = new CountDownLatch(workers);
        CountDownLatch start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(workers)) {
            List<java.util.concurrent.Future<OtpChallengeStore.VerificationResult>> results =
                    java.util.stream.IntStream.range(0, workers).mapToObj(ignored -> executor.submit(() -> {
                        ready.countDown();
                        if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timeout aguardando início");
                        return store.verify("race@example.com", "e".repeat(64), "STEP_UP_PIX", System.currentTimeMillis());
                    })).toList();
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            long successfulConsumers = 0;
            for (var result : results) {
                if (result.get(5, TimeUnit.SECONDS) == OtpChallengeStore.VerificationResult.VALID) successfulConsumers++;
            }
            assertThat(successfulConsumers).isEqualTo(1);
        }
    }
}
