package com.manganetworking.integration;

import com.manganetworking.domain.relational.PasswordResetTokenEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.PasswordResetTokenRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.auth.PasswordResetApplicationService;
import com.manganetworking.service.auth.dto.PasswordResetConfirmDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/** Proves that the pessimistic lock plus single-use delete consume a reset token exactly once. */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class PasswordResetConcurrencyIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7.0");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
    }

    @Autowired private PasswordResetApplicationService service;
    @Autowired private UserRepository users;
    @Autowired private PasswordResetTokenRepository tokens;

    @Test
    void twoSimultaneousConfirmationsConsumeTheTokenOnlyOnce() throws Exception {
        UserEntity user = new UserEntity();
        user.setEmail("reset-race-" + UUID.randomUUID() + "@example.test");
        user.setName("Reset Race");
        user.setPasswordHash("$2a$12$integrationOnly");
        UserEntity saved = users.save(user);

        String rawToken = "race-" + UUID.randomUUID();
        // The application Clock is systemUTC(); LocalDateTime columns therefore store UTC values.
        tokens.saveAndFlush(new PasswordResetTokenEntity(
                saved.getId(), sha256(rawToken), LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10)));

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            var attempt = (java.util.concurrent.Callable<Boolean>) () -> {
                ready.countDown();
                start.await(10, TimeUnit.SECONDS);
                try {
                    service.confirm(new PasswordResetConfirmDto(rawToken, "New secure phrase 2026!"));
                    return true;
                } catch (SecurityException expected) {
                    return false;
                }
            };
            Future<Boolean> first = pool.submit(attempt);
            Future<Boolean> second = pool.submit(attempt);

            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<Boolean> results = List.of(
                    first.get(30, TimeUnit.SECONDS),
                    second.get(30, TimeUnit.SECONDS));

            assertThat(results).containsExactlyInAnyOrder(true, false);
            assertThat(tokens.findById(saved.getId())).isEmpty();
        } finally {
            pool.shutdownNow();
        }
    }

    private static String sha256(String value) throws Exception {
        return java.util.HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
