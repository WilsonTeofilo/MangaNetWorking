package com.manganetworking.integration;

import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Verifies the V7 append-only guarantee against a real PostgreSQL instance. */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class CreatorPixKeyAuditIntegrationTest {

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

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private CreatorRepository creatorRepository;
    @Autowired private UserRepository userRepository;

    @Test
    @DisplayName("V7 permite inserir auditoria PIX e rejeita update/delete no PostgreSQL")
    void auditRowsAreAppendOnly() {
        UserEntity user = new UserEntity();
        user.setEmail("pix-audit-" + UUID.randomUUID() + "@example.test");
        user.setName("PIX Audit Integration");
        user.setCreator(true);
        user.setPasswordHash("$2a$12$integrationOnly");
        UserEntity savedUser = userRepository.save(user);

        CreatorEntity creator = new CreatorEntity();
        creator.setUser(savedUser);
        creator.setHandle("pix" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        creator.setDocumentCpf("12345678900");
        creator.setPixKey("integration@example.test");
        creator.setPixKeyType(PixKeyType.EMAIL);
        CreatorEntity savedCreator = creatorRepository.save(creator);

        UUID auditId = UUID.randomUUID();
        int inserted = jdbcTemplate.update("""
                INSERT INTO creator_pix_key_audit
                    (id, creator_id, actor_user_id, previous_key_type, previous_key_mask,
                     new_key_type, new_key_mask, client_ip)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, auditId, savedCreator.getId(), savedUser.getId(), "EMAIL", "****old1",
                "EMAIL", "****new2", "203.0.113.42");

        assertThat(inserted).isEqualTo(1);
        assertThatThrownBy(() -> jdbcTemplate.update(
                "UPDATE creator_pix_key_audit SET new_key_mask = ? WHERE id = ?", "****edit", auditId))
                .rootCause().hasMessageContaining("creator_pix_key_audit is append-only");
        assertThatThrownBy(() -> jdbcTemplate.update(
                "DELETE FROM creator_pix_key_audit WHERE id = ?", auditId))
                .rootCause().hasMessageContaining("creator_pix_key_audit is append-only");
    }
}
