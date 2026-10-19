package com.manganetworking.service.creator;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.CreatorMissionDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.CreatorMissionMongoRepository;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreatorApplicationServiceTest {

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private CreatorMissionMongoRepository missionRepository;

    @Mock
    private MonetizationService monetizationService;

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
}
