package com.manganetworking.service.moderation;

import com.manganetworking.domain.enums.ReportReason;
import com.manganetworking.domain.enums.ReportStatus;
import com.manganetworking.domain.relational.ReportEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.ReportRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.moderation.dto.CreateReportRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ModerationApplicationServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkFeedMongoRepository workFeedMongoRepository;

    @InjectMocks
    private ModerationApplicationService moderationService;

    private WorkEntity work;
    private UUID workId;

    @BeforeEach
    void setUp() {
        workId = UUID.randomUUID();
        work = new WorkEntity();
        work.setId(workId);
        work.setTitle("Obra em Investigação");
        work.setStatus("ongoing");
    }

    @Test
    @DisplayName("Deve registrar denúncia por violação de pirataria / direitos autorais com status PENDING")
    void shouldSubmitPiracyReportSuccessfully() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(reportRepository.save(any(ReportEntity.class))).thenAnswer(i -> i.getArgument(0));

        CreateReportRequestDto dto = new CreateReportRequestDto(
                workId,
                null,
                ReportReason.COPYRIGHT_PIRACY,
                "Obra copiada integralmente de mangá internacional conhecido."
        );

        ReportEntity report = moderationService.submitReport(null, dto);

        assertNotNull(report);
        assertEquals(ReportReason.COPYRIGHT_PIRACY, report.getReason());
        assertEquals(ReportStatus.PENDING, report.getStatus());
        assertEquals(work, report.getWork());
        verify(reportRepository).save(any(ReportEntity.class));
    }

    @Test
    @DisplayName("Deve suspender obra cautelarmente e atualizar denúncias pendentes para RESOLVED_SUSPENDED")
    void shouldSuspendWorkAndResolveReports() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));

        ReportEntity pendingReport = new ReportEntity();
        pendingReport.setStatus(ReportStatus.PENDING);
        pendingReport.setWork(work);

        when(reportRepository.findAllByWorkIdOrderByCreatedAtDesc(workId)).thenReturn(List.of(pendingReport));

        moderationService.suspendWork(workId, "Violação de Direitos Autorais confirmada");

        assertEquals("suspended", work.getStatus());
        assertEquals(ReportStatus.RESOLVED_SUSPENDED, pendingReport.getStatus());
        assertNotNull(pendingReport.getResolvedAt());
        assertTrue(pendingReport.getResolutionNotes().contains("Violação de Direitos Autorais"));

        verify(workRepository).save(work);
        verify(reportRepository).save(pendingReport);
        // Sem transação ativa (unitário), a remoção do feed ocorre imediatamente.
        verify(workFeedMongoRepository).deleteByWorkId(workId.toString());
    }

    @Test
    @DisplayName("Remoção do feed na suspensão é adiada para o afterCommit (não dentro da transação corrente)")
    void shouldDeferFeedRemovalToAfterCommit() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(reportRepository.findAllByWorkIdOrderByCreatedAtDesc(workId)).thenReturn(List.of());

        TransactionSynchronizationManager.initSynchronization();
        try {
            moderationService.suspendWork(workId, "Motivo de teste");

            // Ainda dentro da transação: nada foi removido do MongoDB.
            verify(workFeedMongoRepository, never()).deleteByWorkId(any());

            // Simula o commit disparando as sincronizações registradas.
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            verify(workFeedMongoRepository).deleteByWorkId(workId.toString());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
