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
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.moderation.dto.CreateReportRequestDto;
import com.manganetworking.service.moderation.dto.PendingReportResponseDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

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
    private final WorkFeedMongoRepository workFeedMongoRepository;

    public ModerationApplicationService(
            ReportRepository reportRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            UserRepository userRepository,
            WorkFeedMongoRepository workFeedMongoRepository
    ) {
        this.reportRepository = reportRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.userRepository = userRepository;
        this.workFeedMongoRepository = workFeedMongoRepository;
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
        report.setDescription(com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.description().trim()));
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

        // Remove a obra suspensa do Feed no MongoDB. A escrita é adiada para DEPOIS do commit: o Mongo
        // não participa da transação JPA e uma falha aqui marcaria a transação relacional como
        // rollback-only (UnexpectedRollbackException), derrubando a própria suspensão.
        // O feed também filtra por status na leitura, garantindo defesa extra caso o Mongo esteja indisponível.
        scheduleFeedRemoval(workId);

        log.warn("[MODERAÇÃO] Obra '{}' foi SUSPENSA cautelarmente da plataforma. Motivo: {}", work.getTitle(), reasonNotes);
    }

    @Transactional
    public void dismissReport(UUID reportId, String resolutionNotes) {
        ReportEntity report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Denúncia não encontrada: " + reportId));

        report.setStatus(ReportStatus.DISMISSED);
        report.setResolvedAt(LocalDateTime.now());
        report.setResolutionNotes(resolutionNotes != null ? resolutionNotes : "Denúncia arquivada pela moderação após análise.");
        reportRepository.save(report);

        log.info("[MODERAÇÃO] Denúncia '{}' foi arquivada/rejeitada. Motivo: {}", reportId, report.getResolutionNotes());
    }

    @Transactional(readOnly = true)
    public List<PendingReportResponseDto> getPendingReports() {
        return reportRepository.findAllByStatusOrderByCreatedAtDesc(ReportStatus.PENDING).stream()
                .map(ModerationApplicationService::toPendingReportDto)
                .toList();
    }

    private static PendingReportResponseDto toPendingReportDto(ReportEntity report) {
        WorkEntity work = report.getWork();
        ChapterEntity chapter = report.getChapter();
        return new PendingReportResponseDto(
                report.getId(),
                work != null ? work.getId() : null,
                work != null ? work.getTitle() : "Obra desconhecida",
                work != null ? work.getCoverUrl() : "",
                chapter != null ? chapter.getId() : null,
                chapter != null ? chapter.getChapterNumber() : null,
                report.getReason() != null ? report.getReason().name() : "OTHER",
                report.getDescription(),
                report.getStatus() != null ? report.getStatus().name() : "PENDING",
                report.getCreatedAt() != null ? report.getCreatedAt().toString() : null
        );
    }

    /** Executa a remoção do feed depois do commit da transação corrente (ou já, se não houver transação). */
    private void scheduleFeedRemoval(UUID workId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    removeFromFeedQuietly(workId);
                }
            });
        } else {
            removeFromFeedQuietly(workId);
        }
    }

    private void removeFromFeedQuietly(UUID workId) {
        try {
            workFeedMongoRepository.deleteByWorkId(workId.toString());
        } catch (Exception e) {
            log.warn("[MODERAÇÃO] Falha ao remover obra {} do feed Mongo: {}", workId, e.getMessage(), e);
        }
    }
}
