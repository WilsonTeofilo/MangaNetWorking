package com.manganetworking.service.user;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.reading.ReadingProgressService;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.FileStorageService;
import com.manganetworking.service.user.PrivacyComplianceService;
import org.springframework.jdbc.core.JdbcTemplate;
import com.manganetworking.service.user.dto.UserDataExportDto;
import com.manganetworking.service.user.dto.UpdateProfileRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProfileLgpdTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ReadingProgressMongoRepository progressRepository;

    @Mock
    private EngagementEventMongoRepository engagementEventRepository;

    @Mock
    private ReadingProgressService readingProgressService;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private SessionService sessionService;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private PrivacyComplianceService privacyComplianceService;

    @InjectMocks
    private UserProfileApplicationService profileService;

    private UserEntity user;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new UserEntity();
        user.setId(userId);
        user.setName("Wilson Teofilo");
        user.setEmail("wilson@teste.com");
        user.setProfilePublic(false); // Perfil privado
        user.setCreatedAt(LocalDateTime.now().minusMonths(6));
    }

    @Test
    @DisplayName("Deve bloquear visualização de perfil privado por terceiros (IDOR/Privacidade)")
    void shouldBlockPrivateProfileForThirdParties() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UUID thirdPartyId = UUID.randomUUID();

        assertThrows(AccessDeniedException.class, () ->
                profileService.getReaderProfile(userId, thirdPartyId)
        );
    }

    @Test
    @DisplayName("Perfil leitor não aceita avatar remoto nem caminho não normalizado")
    void shouldAcceptOnlyNormalizedPlatformAvatar() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenReturn(user);
        String avatarPath = "/api/storage/123e4567-e89b-12d3-a456-426614174000.jpg";

        profileService.updateProfile(userId, new UpdateProfileRequestDto(null, avatarPath, null, null));
        assertEquals(avatarPath, user.getAvatarUrl());

        assertThrows(IllegalArgumentException.class, () -> profileService.updateProfile(
                userId, new UpdateProfileRequestDto(null, "https://attacker.example/avatar.jpg", null, null)));
    }

    @Test
    @DisplayName("Deve permitir exportação completa dos dados do titular (Art. 18 LGPD)")
    void shouldExportUserDataForPortability() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(progressRepository.findAllByUserIdOrderByUpdatedAtDesc(userId.toString()))
                .thenReturn(Collections.emptyList());

        UserDataExportDto export = profileService.exportUserData(userId);

        assertNotNull(export);
        assertEquals(userId, export.userId());
        assertEquals("Wilson Teofilo", export.name());
        assertEquals("wilson@teste.com", export.email());
        verify(progressRepository).findAllByUserIdOrderByUpdatedAtDesc(userId.toString());
    }

    @Test
    @DisplayName("Deve anonimizar dados cadastrais e expurgar histórico do Mongo no Direito ao Esquecimento (LGPD)")
    void shouldAnonymizeUserDataOnRightToBeForgotten() {
        user.setModerator(true);
        user.setOwner(true);
        user.setCreator(true);
        user.setVip(true);
        user.setVipExpiresAt(LocalDateTime.now().plusDays(30));
        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setBirthDate(java.time.LocalDate.of(1990, 1, 1));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.deleteUserAccountLgpd(userId);

        assertTrue(user.getName().contains("Usuário Removido"));
        assertTrue(user.getEmail().contains("anon-"));
        assertNull(user.getPasswordHash());
        assertNull(user.getEmailVerifiedAt());
        assertNull(user.getBirthDate());
        assertFalse(user.isTwoFactorEnabled());
        assertFalse(user.isProfilePublic());
        assertFalse(user.isModerator());
        assertFalse(user.isOwner());
        assertFalse(user.isCreator());
        assertFalse(user.isVip());
        assertNull(user.getVipExpiresAt());

        verify(userRepository).save(user);
        verify(progressRepository).deleteAllByUserId(userId.toString());
    }

    @Test
    @DisplayName("Deve revogar sessões e apagar avatar do titular na exclusão de conta (LGPD)")
    void shouldRevokeSessionsAndDeleteReaderAvatarOnRightToBeForgotten() {
        user.setAvatarUrl("/api/storage/avatar-user.png");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.deleteUserAccountLgpd(userId);

        verify(sessionService).revokeSessionsForUser(userId);
        verify(fileStorageService).deleteFile("avatar-user.png");
        assertNull(user.getAvatarUrl());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("Deve anonimizar CPF, PIX, handle, bio, redes e avatar do criador (LGPD)")
    void shouldAnonymizeCreatorProfileOnRightToBeForgotten() {
        user.setAvatarUrl("/api/storage/avatar-user.png");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle("wilson_creator");
        creator.setBio("Biografia pessoal identificável");
        creator.setAvatarUrl("/api/storage/avatar-creator.png");
        creator.setInstagramUrl("https://instagram.com/wilson");
        creator.setYoutubeUrl("https://youtube.com/@wilson");
        creator.setPortfolioUrl("https://wilson.dev");
        creator.setDocumentCpf("12345678900");
        creator.setPixKey("wilson@teste.com");
        when(creatorRepository.findByUserId(userId)).thenReturn(Optional.of(creator));

        profileService.deleteUserAccountLgpd(userId);

        verify(fileStorageService).deleteFile("avatar-creator.png");
        assertNull(creator.getAvatarUrl());
        assertNull(creator.getBio());
        assertNull(creator.getInstagramUrl());
        assertNull(creator.getYoutubeUrl());
        assertNull(creator.getPortfolioUrl());
        assertNotEquals("wilson_creator", creator.getHandle());
        assertTrue(creator.getHandle().startsWith("anon-"));
        assertTrue(creator.getDocumentCpf().startsWith("ANONIMIZADO-"));
        assertTrue(creator.getPixKey().startsWith("ANONIMIZADO-"));
        verify(creatorRepository).save(creator);
    }

    @Test
    @DisplayName("Não deve apagar arquivo local homônimo quando o avatar é uma URL externa")
    void shouldNotDeleteFilesForExternalAvatarUrls() {
        user.setAvatarUrl("https://cdn.example.com/avatar-user.png");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.deleteUserAccountLgpd(userId);

        verify(fileStorageService, never()).deleteFile(anyString());
        assertNull(user.getAvatarUrl());
    }

    @Test
    @DisplayName("Não deve confirmar exclusão se o avatar não puder ser removido fisicamente")
    void shouldAbortAccountDeletionWhenStorageFails() {
        user.setAvatarUrl("/api/storage/avatar-user.png");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        doThrow(new RuntimeException("storage offline"))
                .when(fileStorageService).deleteFile("avatar-user.png");

        assertThrows(IllegalStateException.class, () -> profileService.deleteUserAccountLgpd(userId));

        assertEquals("Wilson Teofilo", user.getName());
        verify(userRepository, never()).save(user);
        verify(progressRepository, never()).deleteAllByUserId(userId.toString());
    }
}
