package com.manganetworking.service.user;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import com.manganetworking.service.reading.ReadingProgressService;
import com.manganetworking.service.user.dto.UserDataExportDto;
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
    private ReadingProgressService readingProgressService;

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
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        profileService.deleteUserAccountLgpd(userId);

        assertTrue(user.getName().contains("Usuário Removido"));
        assertTrue(user.getEmail().contains("anon-"));
        assertNull(user.getPasswordHash());
        assertFalse(user.isTwoFactorEnabled());
        assertFalse(user.isProfilePublic());

        verify(userRepository).save(user);
        verify(progressRepository).deleteAllByUserId(userId.toString());
    }
}
