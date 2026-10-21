package com.manganetworking.service.user;

import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.user.dto.UpdateProfileRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Username: identificador público e segunda via de login.
 *
 * <p>Regra: pode ser reivindicado <strong>uma vez</strong> (enquanto a conta usa o
 * identificador gerado automaticamente) e depois é imutável.</p>
 */
@ExtendWith(MockitoExtension.class)
class UsernameClaimTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private com.manganetworking.repository.jpa.WorkRepository workRepository;

    @Mock
    private com.manganetworking.repository.mongo.ReadingProgressMongoRepository progressRepository;

    @Mock
    private com.manganetworking.repository.mongo.EngagementEventMongoRepository engagementEventRepository;

    @Mock
    private com.manganetworking.service.reading.ReadingProgressService readingProgressService;

    @Mock
    private com.manganetworking.repository.jpa.CreatorRepository creatorRepository;

    @Mock
    private com.manganetworking.service.storage.FileStorageService fileStorageService;

    @Mock
    private com.manganetworking.service.session.SessionService sessionService;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Mock
    private com.manganetworking.service.user.PrivacyComplianceService privacyComplianceService;

    @InjectMocks
    private UserProfileApplicationService profileService;

    private UserEntity user;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new UserEntity();
        user.setId(userId);
        user.setEmail("wilson@teste.com");
        user.setName("Wilson");
    }

    @Test
    @DisplayName("Conta com username gerado pode reivindicar um username próprio")
    void shouldClaimUsernameWhenStillGenerated() {
        user.setUsername("user_" + userId.toString().replace("-", "").substring(0, 12));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("wilson.teofilo")).thenReturn(false);

        profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, null, "  Wilson.Teofilo "));

        assertEquals("wilson.teofilo", user.getUsername());
    }

    @Test
    @DisplayName("Username já escolhido é imutável")
    void shouldRejectChangingChosenUsername() {
        user.setUsername("wilson.teofilo");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () ->
                profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, null, "outro")));

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Username em uso é recusado")
    void shouldRejectTakenUsername() {
        user.setUsername("user_" + userId.toString().replace("-", "").substring(0, 12));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("wilson")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () ->
                profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, null, "wilson")));
    }
}
