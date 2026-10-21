package com.manganetworking.service.user;

import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.user.dto.UpdateProfileRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

/**
 * Primeiro acesso (montar o perfil): o sinal precisa vir do servidor e ser salvo junto
 * com o perfil — antes disso, todo login caía no onboarding mesmo com o perfil pronto.
 */
@ExtendWith(MockitoExtension.class)
class ProfileOnboardingCompletionTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private com.manganetworking.repository.jpa.WorkRepository workRepository;

    @Mock
    private com.manganetworking.repository.mongo.ReadingProgressMongoRepository progressRepository;

    @Mock
    private com.manganetworking.repository.mongo.EngagementEventMongoRepository engagementEventRepository;

    @Mock
    private com.manganetworking.service.reading.ReadingProgressService readingProgressService;

    @Mock
    private com.manganetworking.service.storage.FileStorageService fileStorageService;

    @Mock
    private com.manganetworking.service.session.SessionService sessionService;

    @Mock
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Mock
    private com.manganetworking.service.user.PrivacyComplianceService privacyComplianceService;

    @Mock
    private AccountIdentityService accountIdentityService;

    private UserProfileApplicationService profileService;
    private UUID userId;
    private UserEntity user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new UserEntity();
        user.setId(userId);
        user.setEmail("leitor@teste.com");
        user.setName("Leitor");
        profileService = new UserProfileApplicationService(
                userRepository,
                workRepository,
                progressRepository,
                engagementEventRepository,
                readingProgressService,
                creatorRepository,
                fileStorageService,
                sessionService,
                jdbcTemplate,
                privacyComplianceService,
                accountIdentityService);
    }

    @Test
    @DisplayName("Conta que ainda nao configurou o perfil nao tem o sinal de primeiro acesso")
    void shouldNotMarkOnboardingBeforeProfileIsSaved() {
        assertNull(user.getProfileOnboardingCompletedAt());
    }

    @Test
    @DisplayName("Salvar o perfil encerra o primeiro acesso")
    void shouldMarkOnboardingCompletedWhenProfileIsSaved() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, true, null));

        assertNotNull(user.getProfileOnboardingCompletedAt());
        assertNotNull(LocalDateTime.now());
    }
}
