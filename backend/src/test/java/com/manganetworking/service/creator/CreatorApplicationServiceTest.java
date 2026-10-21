package com.manganetworking.service.creator;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.CreatorMissionDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.CreatorPixKeyAuditEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.creator.dto.ApplyAsCreatorRequestDto;
import com.manganetworking.repository.jpa.CreatorPixKeyAuditRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.CreatorMissionMongoRepository;
import com.manganetworking.service.creator.dto.UpdateCreatorIdentityRequestDto;
import com.manganetworking.service.creator.dto.UpdatePixKeyRequestDto;
import com.manganetworking.service.mfa.TwoFactorAuthService;
import com.manganetworking.service.monetization.MonetizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreatorApplicationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private CreatorPixKeyAuditRepository pixKeyAuditRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private CreatorMissionMongoRepository missionRepository;

    @Mock
    private MonetizationService monetizationService;

    @Mock
    private TwoFactorAuthService twoFactorAuthService;

    @InjectMocks
    private CreatorApplicationService creatorService;

    private UUID creatorId;
    private CreatorEntity creator;

    @BeforeEach
    void setUp() {
        creatorId = UUID.randomUUID();
        creator = new CreatorEntity();
        creator.setId(creatorId);
        creator.setHandle("autor");
        creator.setMonetizationLevel(0);

        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("autor@test.com");
        user.setName("Autor Teste");
        user.setBirthDate(java.time.LocalDate.now().minusYears(20));
        creator.setUser(user);
    }

    @Test
    @DisplayName("Atualiza redes apenas com domínios oficiais e portfólio HTTPS")
    void shouldValidatePublicCreatorProfileLinks() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(creatorRepository.save(any(CreatorEntity.class))).thenReturn(creator);

        creatorService.updateCreatorIdentity(creatorId, new UpdateCreatorIdentityRequestDto(
                null, null, " https://www.instagram.com/autor ",
                "https://youtu.be/video", "https://portfolio.example/autor", null));

        assertEquals("https://www.instagram.com/autor", creator.getInstagramUrl());
        assertEquals("https://youtu.be/video", creator.getYoutubeUrl());
        assertEquals("https://portfolio.example/autor", creator.getPortfolioUrl());
        verify(creatorRepository).save(creator);
    }

    @Test
    @DisplayName("Remove HTML da bio e aceita apenas avatar normalizado pela plataforma")
    void shouldSanitizeBioAndRequireNormalizedAvatarUrl() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        String avatarPath = "/api/storage/123e4567-e89b-12d3-a456-426614174000.jpg";

        creatorService.updateCreatorIdentity(creatorId, new UpdateCreatorIdentityRequestDto(
                null, "Autor <img src=x onerror=alert(1)> seguro", null, null, null, avatarPath));

        assertEquals("Autor  seguro", creator.getBio());
        assertEquals(avatarPath, creator.getAvatarUrl());
        assertThrows(IllegalArgumentException.class, () -> creatorService.updateCreatorIdentity(
                creatorId, new UpdateCreatorIdentityRequestDto(null, null, null, null, null,
                        "https://attacker.example/avatar.jpg")));
    }

    @Test
    @DisplayName("Rejeita links sociais falsos e portfólio sem HTTPS antes de persistir")
    void shouldRejectUntrustedCreatorProfileLinks() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));

        assertThrows(IllegalArgumentException.class, () -> creatorService.updateCreatorIdentity(
                creatorId, new UpdateCreatorIdentityRequestDto(null, null,
                        "https://instagram.com.evil.example/autor", null, null, null)));
        assertThrows(IllegalArgumentException.class, () -> creatorService.updateCreatorIdentity(
                creatorId, new UpdateCreatorIdentityRequestDto(null, null,
                        null, "http://youtube.com/@autor", null, null)));
        assertThrows(IllegalArgumentException.class, () -> creatorService.updateCreatorIdentity(
                creatorId, new UpdateCreatorIdentityRequestDto(null, null,
                        null, null, "javascript:alert(1)", null)));

        verify(creatorRepository, never()).save(any(CreatorEntity.class));
    }

    @Test
    @DisplayName("Registra troca de PIX em auditoria append-only com chaves mascaradas")
    void auditsPixKeyChangeWithoutPersistingRawKeys() {
        creator.setPixKey("old-private-pix-value-1234");
        creator.setPixKeyType(PixKeyType.CPF);
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(twoFactorAuthService.verifyOtp("autor@test.com", "123456", TwoFactorAuthService.OtpPurpose.STEP_UP_PIX))
                .thenReturn(true);

        creatorService.updatePixKey(creatorId,
                new UpdatePixKeyRequestDto("new-private-pix-value-9876", PixKeyType.EMAIL, "123456"),
                "203.0.113.42");

        org.mockito.ArgumentCaptor<CreatorPixKeyAuditEntity> auditCaptor =
                org.mockito.ArgumentCaptor.forClass(CreatorPixKeyAuditEntity.class);
        verify(pixKeyAuditRepository).save(auditCaptor.capture());
        CreatorPixKeyAuditEntity audit = auditCaptor.getValue();
        assertEquals("****1234", audit.getPreviousKeyMask());
        assertEquals("****9876", audit.getNewKeyMask());
        assertEquals("CPF", audit.getPreviousKeyType());
        assertEquals("EMAIL", audit.getNewKeyType());
        assertEquals("203.0.113.42", audit.getClientIp());
        assertEquals(creator.getUser().getId(), audit.getActorUserId());
        verify(creatorRepository).save(creator);
    }

    private CreatorMissionDocument mission(String missionId, String ownerId, boolean completed, int progress, int goal) {
        CreatorMissionDocument m = new CreatorMissionDocument();
        m.setId(missionId);
        m.setCreatorId(ownerId);
        m.setCompleted(completed);
        m.setCurrentProgress(progress);
        m.setTargetGoal(goal);
        m.setTitle("Missão de teste");
        return m;
    }

    @Test
    @DisplayName("Resgate falha quando a missão não existe")
    void claimFailsWhenMissionMissing() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m1")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class,
                () -> creatorService.claimMissionReward(creatorId, "m1"));
    }

    @Test
    @DisplayName("Resgate falha quando a missão pertence a outro autor (ownership)")
    void claimFailsWhenMissionBelongsToAnotherCreator() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m1"))
                .thenReturn(Optional.of(mission("m1", UUID.randomUUID().toString(), false, 3, 3)));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class,
                () -> creatorService.claimMissionReward(creatorId, "m1"));
        assertTrue(ex.getMessage().contains("outro autor"));
    }

    @Test
    @DisplayName("Resgate falha quando a missão já foi resgatada")
    void claimFailsWhenAlreadyCompleted() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m1"))
                .thenReturn(Optional.of(mission("m1", creatorId.toString(), true, 3, 3)));

        assertThrows(IllegalStateException.class,
                () -> creatorService.claimMissionReward(creatorId, "m1"));
    }

    @Test
    @DisplayName("Resgate falha quando a missão ainda não foi concluída")
    void claimFailsWhenNotCompleted() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m1"))
                .thenReturn(Optional.of(mission("m1", creatorId.toString(), false, 1, 3)));

        assertThrows(IllegalStateException.class,
                () -> creatorService.claimMissionReward(creatorId, "m1"));
    }

    @Test
    @DisplayName("Resgate aplica o boost da Season e avança o nível de monetização")
    void claimAppliesBoostAndAdvancesLevel() {
        CreatorMissionDocument mission = mission("m1", creatorId.toString(), false, 3, 3);
        mission.setBoostRewardMultiplier(2.0);
        mission.setBoostDurationHours(24);

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m1")).thenReturn(Optional.of(mission));
        when(missionRepository.save(any(CreatorMissionDocument.class))).thenReturn(mission);
        when(creatorRepository.save(any(CreatorEntity.class))).thenReturn(creator);

        CreatorEntity updated = creatorService.claimMissionReward(creatorId, "m1");

        assertTrue(mission.isCompleted());
        assertNotNull(mission.getCompletedAt());
        assertEquals(2.0, updated.getEngagementBoostMul());
        assertTrue(updated.hasActiveBoost());
        assertTrue(updated.getEngagementBoostUntil().isAfter(LocalDateTime.now().plusHours(23)));
        assertEquals(2, updated.getMonetizationLevel());
    }

    @Test
    @DisplayName("Deve rejeitar avanço para nível 2 se criador for menor de 18 anos (Art. 14 LGPD)")
    void shouldRejectMonetizationLevel2IfUnderage() {
        creator.getUser().setBirthDate(java.time.LocalDate.now().minusYears(16));
        CreatorMissionDocument mission = mission("m2", creatorId.toString(), false, 3, 3);

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m2")).thenReturn(Optional.of(mission));

        com.manganetworking.config.exception.AccessDeniedException ex = assertThrows(
                com.manganetworking.config.exception.AccessDeniedException.class,
                () -> creatorService.claimMissionReward(creatorId, "m2")
        );

        assertTrue(ex.getMessage().contains("maioridade legal (18+ anos)"));
    }

    @Test
    @DisplayName("Deve rejeitar avanço para nível 2 se data de nascimento não estiver preenchida")
    void shouldRejectMonetizationLevel2IfBirthDateNull() {
        creator.getUser().setBirthDate(null);
        CreatorMissionDocument mission = mission("m3", creatorId.toString(), false, 3, 3);

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(missionRepository.findById("m3")).thenReturn(Optional.of(mission));

        assertThrows(
                com.manganetworking.config.exception.AccessDeniedException.class,
                () -> creatorService.claimMissionReward(creatorId, "m3")
        );
    }

    @Test
    @DisplayName("Virar escritor recicla o username da conta de leitor e herda a foto")
    void shouldReuseReaderUsernameAndAvatarWhenBecomingWriter() {
        UserEntity reader = new UserEntity();
        reader.setId(UUID.randomUUID());
        reader.setEmail("leitor@teste.com");
        reader.setName("Leitor Que Virou Autor");
        reader.setUsername("teofilo");
        reader.setAvatarUrl("/api/storage/avatar-uuid.jpg");

        when(userRepository.findById(reader.getId())).thenReturn(Optional.of(reader));
        when(creatorRepository.findByUserId(reader.getId())).thenReturn(Optional.empty());
        when(creatorRepository.findByHandle("teofilo")).thenReturn(Optional.empty());

        CreatorEntity created = creatorService.applyAsWriter(reader.getId(),
                new ApplyAsCreatorRequestDto("https://instagram.com/teofilo", null, null, null));

        assertEquals("teofilo", created.getHandle());
        assertEquals("/api/storage/avatar-uuid.jpg", created.getAvatarUrl());
        assertEquals("https://instagram.com/teofilo", created.getInstagramUrl());
        assertTrue(reader.isCreator());
        verify(userRepository).save(reader);
    }

    @Test
    @DisplayName("Vira escritor exige pelo menos um vinculo social")
    void shouldRequireAtLeastOneSocialLink() {
        UserEntity reader = new UserEntity();
        reader.setId(UUID.randomUUID());
        reader.setEmail("leitor@teste.com");
        reader.setUsername("semlink");

        when(userRepository.findById(reader.getId())).thenReturn(Optional.of(reader));
        when(creatorRepository.findByUserId(reader.getId())).thenReturn(Optional.empty());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () ->
                creatorService.applyAsWriter(reader.getId(),
                        new ApplyAsCreatorRequestDto(null, null, null, null)));

        assertTrue(exception.getMessage().contains("pelo menos um link social"));
        verify(creatorRepository, never()).save(any());
    }

    @Test
    @DisplayName("Username que ja e handle de outro autor e recusado")
    void shouldRejectUsernameAlreadyUsedAsAnotherAuthorHandle() {
        UserEntity reader = new UserEntity();
        reader.setId(UUID.randomUUID());
        reader.setEmail("leitor@teste.com");
        reader.setUsername("ocupado");

        when(userRepository.findById(reader.getId())).thenReturn(Optional.of(reader));
        when(creatorRepository.findByUserId(reader.getId())).thenReturn(Optional.empty());
        when(creatorRepository.findByHandle("ocupado")).thenReturn(Optional.of(creator));

        assertThrows(IllegalArgumentException.class, () ->
                creatorService.applyAsWriter(reader.getId(),
                        new ApplyAsCreatorRequestDto("https://instagram.com/ocupado", null, null, null)));

        verify(creatorRepository, never()).save(any());
    }
}
