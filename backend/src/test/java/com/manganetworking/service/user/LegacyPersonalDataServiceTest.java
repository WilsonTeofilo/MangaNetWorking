package com.manganetworking.service.user;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.service.user.dto.LegacyPersonalDataReport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LegacyPersonalDataServiceTest {

    private static final String SENTINEL_CPF = "11111111111";

    private final CreatorRepository creatorRepository = mock(CreatorRepository.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final LegacyPersonalDataService service = new LegacyPersonalDataService(creatorRepository, jdbcTemplate);

    @Test
    @DisplayName("Dry-run detecta CPF sentinela e não altera o cadastro")
    void dryRunDetectsSentinelWithoutPurging() {
        CreatorEntity creator = creator("criador-legacy", 0, SENTINEL_CPF);
        when(creatorRepository.findAll()).thenReturn(List.of(creator));

        LegacyPersonalDataReport report = service.auditAndSanitize(UUID.randomUUID(), false);

        assertEquals(1, report.scanned());
        assertEquals(1, report.legacyEntries().size());
        assertEquals(0, report.purged());
        assertTrue(report.dryRun());
        assertTrue(report.requiresHumanDecision().isEmpty());
        verify(creatorRepository, never()).save(any());
        verify(jdbcTemplate, org.mockito.Mockito.atLeastOnce())
                .update(anyString(), eq("LEGACY_CPF_AUDIT_DRY_RUN"), any(), isNull(), isNull(), anyString());
    }

    @Test
    @DisplayName("Sanitize remove CPF sentinela de criador que ainda não monetiza")
    void sanitizePurgesSentinelForNonMonetizedCreator() {
        CreatorEntity creator = creator("criador-legacy", 0, SENTINEL_CPF);
        when(creatorRepository.findAll()).thenReturn(List.of(creator));

        LegacyPersonalDataReport report = service.auditAndSanitize(UUID.randomUUID(), true);

        assertEquals(1, report.purged());
        assertFalse(report.dryRun());
        assertTrue(creator.getDocumentCpf() == null, "CPF inválido deve ser removido");
        verify(creatorRepository).save(creator);
        verify(jdbcTemplate, org.mockito.Mockito.atLeastOnce())
                .update(anyString(), eq("LEGACY_CPF_PURGED"), any(), any(), any(), anyString());
    }

    @Test
    @DisplayName("Criador já monetizado vai para decisão humana e não é alterado")
    void monetizedCreatorRequiresHumanDecision() {
        CreatorEntity creator = creator("criador-pago", 3, SENTINEL_CPF);
        when(creatorRepository.findAll()).thenReturn(List.of(creator));

        LegacyPersonalDataReport report = service.auditAndSanitize(UUID.randomUUID(), true);

        assertEquals(0, report.purged());
        assertEquals(1, report.requiresHumanDecision().size());
        assertEquals(SENTINEL_CPF, creator.getDocumentCpf());
        verify(creatorRepository, never()).save(any());
    }

    @Test
    @DisplayName("CPF válido e cadastro sem CPF não entram no relatório")
    void validOrAbsentCpfIsIgnored() {
        CreatorEntity valid = creator("criador-ok", 0, "52998224725");
        CreatorEntity absent = creator("criador-sem-cpf", 0, null);
        when(creatorRepository.findAll()).thenReturn(List.of(valid, absent));

        LegacyPersonalDataReport report = service.auditAndSanitize(UUID.randomUUID(), true);

        assertEquals(2, report.scanned());
        assertTrue(report.legacyEntries().isEmpty());
        assertEquals(0, report.purged());
    }

    private CreatorEntity creator(String handle, int level, String cpf) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail(handle + "@exemplo.test");
        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle(handle);
        creator.setUser(user);
        creator.setMonetizationLevel(level);
        creator.setDocumentCpf(cpf);
        return creator;
    }
}
