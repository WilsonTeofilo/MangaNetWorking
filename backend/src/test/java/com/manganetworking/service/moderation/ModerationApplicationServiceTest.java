package com.manganetworking.service.moderation;
import com.manganetworking.domain.enums.WorkStatus;

import com.manganetworking.domain.enums.ReportReason;
import com.manganetworking.domain.enums.ReportStatus;
import com.manganetworking.domain.relational.ReportEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.ReportRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedRemovalEvent;
import com.manganetworking.service.moderation.dto.CreateReportRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

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
    private ApplicationEventPublisher eventPublisher;

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
        work.setStatus(WorkStatus.ONGOING);
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

        assertEquals(WorkStatus.SUSPENDED, work.getStatus());
        assertEquals(ReportStatus.RESOLVED_SUSPENDED, pendingReport.getStatus());
        assertNotNull(pendingReport.getResolvedAt());
        assertTrue(pendingReport.getResolutionNotes().contains("Violação de Direitos Autorais"));

        verify(workRepository).save(work);
        verify(reportRepository).save(pendingReport);
        // A remoção do feed é delegada ao listener de evento (AFTER_COMMIT), não escrita aqui.
        verify(eventPublisher).publishEvent(new WorkFeedRemovalEvent(workId));
    }
}
