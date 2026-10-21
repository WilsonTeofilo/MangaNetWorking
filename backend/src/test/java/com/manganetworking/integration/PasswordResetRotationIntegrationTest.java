package com.manganetworking.integration;

import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.auth.PasswordResetApplicationService;
import com.manganetworking.service.auth.dto.PasswordResetRequestDto;
import com.manganetworking.service.mfa.MfaNotificationSender;
import com.manganetworking.service.mfa.OtpIssuanceLimiter;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Proves that requesting again while a link is active rotates, rather than reuses, the token. */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class PasswordResetRotationIntegrationTest {

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
    @Autowired private JdbcTemplate jdbcTemplate;
    @MockBean private OtpIssuanceLimiter limiter;
    @MockBean private MfaNotificationSender sender;

    @Test
    void reRequestInvalidatesThePreviousActiveLink() throws Exception {
        when(limiter.tryAcquire(anyString(), anyString(), anyString())).thenReturn(true);

        UserEntity user = new UserEntity();
        String email = "reset-rotation-" + UUID.randomUUID() + "@example.test";
        user.setEmail(email);
        user.setUsername("resetrotation" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        user.setName("Reset Rotation");
        user.setPasswordHash("$2a$12$integrationOnly");
        users.save(user);

        service.request(new PasswordResetRequestDto(email), new MockHttpServletRequest());
        service.request(new PasswordResetRequestDto(email), new MockHttpServletRequest());

        ArgumentCaptor<String> links = ArgumentCaptor.forClass(String.class);
        verify(sender, times(2)).sendPasswordResetLink(eq(email), links.capture(), eq(30L));
        List<String> values = links.getAllValues();

        String firstToken = extractToken(values.get(0));
        String secondToken = extractToken(values.get(1));
        assertThat(firstToken).isNotEqualTo(secondToken);
        assertThat(countByHash(sha256(firstToken))).isZero();
        assertThat(countByHash(sha256(secondToken))).isEqualTo(1);
    }

    private int countByHash(String hash) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from password_reset_tokens where token_hash = ?", Integer.class, hash);
        return count == null ? 0 : count;
    }

    private static String extractToken(String link) {
        String marker = "reset-password#token=";
        int index = link.indexOf(marker);
        assertThat(index).isGreaterThanOrEqualTo(0);
        return link.substring(index + marker.length());
    }

    private static String sha256(String value) throws Exception {
        return java.util.HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
