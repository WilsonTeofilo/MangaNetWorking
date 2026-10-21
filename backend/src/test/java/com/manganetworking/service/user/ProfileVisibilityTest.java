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

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Visibilidade do perfil: o leitor escolhe, o escritor e sempre publico.
 */
@ExtendWith(MockitoExtension.class)
class ProfileVisibilityTest {

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
        user.setEmail("autor@teste.com");
        user.setName("Autor");
        user.setUsername("autor");
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
    @DisplayName("Leitor pode deixar o perfil privado")
    void readerCanHideProfile() {
        user.setCreator(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, false, null));

        assertFalse(user.isProfilePublic());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("Escritor nao pode deixar o perfil privado")
    void writerCannotHideProfile() {
        user.setCreator(true);
        user.setProfilePublic(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, false, null)));

        assertTrue(exception.getMessage().contains("sempre"));
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Escritor mantem o perfil publico")
    void writerKeepsPublicProfile() {
        user.setCreator(true);
        user.setProfilePublic(true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.updateProfile(userId, new UpdateProfileRequestDto(null, null, true, null));

        assertTrue(user.isProfilePublic());
    }
}
