package com.manganetworking.service.session;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RedisSessionStoreTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private SetOperations<String, String> setOperations;

    private RedisSessionStore sessionStore;

    @BeforeEach
    void setUp() {
        org.mockito.Mockito.lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        sessionStore = new RedisSessionStore(redisTemplate);
    }

    @Test
    @DisplayName("Deve salvar sessão com chave serializada e associar ao set reverso do usuário")
    void shouldSaveSessionWithReverseUserIndex() {
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        UUID userId = UUID.randomUUID();
        SessionService.UserSession session = new SessionService.UserSession(
                "sess-123",
                userId,
                "user@test.com",
                "Tester",
                true,
                false,
                UUID.randomUUID(),
                "tester_creator",
                Instant.now().plus(Duration.ofHours(2))
        );

        sessionStore.save(session);

        verify(valueOperations).set(eq("mn:session:sess-123"), anyString(), any(Duration.class));
        verify(setOperations).add("mn:user:sessions:" + userId, "sess-123");
    }

    @Test
    @DisplayName("Deve retornar vazio quando chave de sessão não existe no Redis")
    void shouldReturnEmptyWhenSessionNotFound() {
        when(valueOperations.get("mn:session:non-existent")).thenReturn(null);

        Optional<SessionService.UserSession> result = sessionStore.findById("non-existent");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Lê sessões Redis antigas com o campo derivado expired sem invalidá-las")
    void shouldReadLegacySessionJsonWithDerivedExpiredField() {
        String json = """
                {"sessionId":"sess-legacy","userId":"%s","email":"user@test.com","name":"Tester",
                 "isCreator":false,"isModerator":false,"creatorId":null,"creatorHandle":null,
                 "expiresAt":"2099-01-01T00:00:00Z","expired":false}
                """.formatted(UUID.randomUUID());
        when(valueOperations.get("mn:session:sess-legacy")).thenReturn(json);

        Optional<SessionService.UserSession> result = sessionStore.findById("sess-legacy");

        assertThat(result).isPresent();
        assertThat(result.orElseThrow().sessionId()).isEqualTo("sess-legacy");
    }

    @Test
    @DisplayName("Deve revogar todas as sessões do usuário no Redis via índice reverso (LGPD Art. 18)")
    void shouldRemoveAllUserSessionsByUserId() {
        when(redisTemplate.opsForSet()).thenReturn(setOperations);

        UUID userId = UUID.randomUUID();
        when(setOperations.members("mn:user:sessions:" + userId))
                .thenReturn(Set.of("sess-alpha", "sess-beta"));

        int removed = sessionStore.removeByUserId(userId);

        assertThat(removed).isEqualTo(2);
        verify(redisTemplate).delete("mn:session:sess-alpha");
        verify(redisTemplate).delete("mn:session:sess-beta");
        verify(redisTemplate).delete("mn:user:sessions:" + userId);
    }
}
