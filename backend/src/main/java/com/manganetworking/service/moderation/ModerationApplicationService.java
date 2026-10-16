package com.manganetworking.service.moderation;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.enums.ReportReason;
import com.manganetworking.domain.enums.ReportStatus;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.ReportEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.ReportRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.moderation.dto.CreateReportRequestDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ModerationApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ModerationApplicationService.class);

    private final ReportRepository reportRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final UserRepository userRepository;

    public ModerationApplicationService(
            ReportRepository reportRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            UserRepository userRepository
    ) {
        this.reportRepository = reportRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ReportEntity submitReport(UUID reporterUserId, CreateReportRequestDto dto) {
        WorkEntity work = workRepository.findById(dto.workId())
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + dto.workId()));

        ChapterEntity chapter = null;
        if (dto.chapterId() != null) {
            chapter = chapterRepository.findById(dto.chapterId()).orElse(null);
        }

        UserEntity reporter = null;
        if (reporterUserId != null) {
            reporter = userRepository.findById(reporterUserId).orElse(null);
        }

        ReportEntity report = new ReportEntity();
        report.setReporter(reporter);
        report.setWork(work);
        report.setChapter(chapter);
        report.setReason(dto.reason());
        report.setDescription(dto.description());
        report.setStatus(ReportStatus.PENDING);

        ReportEntity saved = reportRepository.save(report);

        if (dto.reason() == ReportReason.COPYRIGHT_PIRACY || dto.reason() == ReportReason.PORNOGRAPHY_HENTAI) {
            log.warn("[MODERAÇÃO/ALERTA GRAVE] Denúncia crítica recebida para a obra '{}' (ID: {}). Motivo: {}",
                    work.getTitle(), work.getId(), dto.reason());
        }

        return saved;
    }

    @Transactional
    public void suspendWork(UUID workId, String reasonNotes) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + workId));

        work.setStatus("suspended");
        workRepository.save(work);

        List<ReportEntity> reports = reportRepository.findAllByWorkIdOrderByCreatedAtDesc(workId);
        for (ReportEntity rep : reports) {
            if (rep.getStatus() == ReportStatus.PENDING || rep.getStatus() == ReportStatus.INVESTIGATING) {
                rep.setStatus(ReportStatus.RESOLVED_SUSPENDED);
                rep.setResolvedAt(LocalDateTime.now());
                rep.setResolutionNotes("Obra suspensa cautelarmente por moderação: " + reasonNotes);
                reportRepository.save(rep);
            }
        }

        log.warn("[MODERAÇÃO] Obra '{}' foi SUSPENSA cautelarmente da plataforma. Motivo: {}", work.getTitle(), reasonNotes);
    }

    @Transactional(readOnly = true)
    public List<ReportEntity> getPendingReports() {
        return reportRepository.findAllByStatusOrderByCreatedAtDesc(ReportStatus.PENDING);
    }
}
