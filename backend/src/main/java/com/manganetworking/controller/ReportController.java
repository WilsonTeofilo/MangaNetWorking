package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.domain.relational.ReportEntity;
import com.manganetworking.service.moderation.ModerationApplicationService;
import com.manganetworking.service.moderation.dto.CreateReportRequestDto;
import com.manganetworking.service.moderation.dto.ModerationActionRequestDto;
import com.manganetworking.service.moderation.dto.PendingReportResponseDto;
import com.manganetworking.service.work.WorkCommentService;
import com.manganetworking.service.work.dto.CommentReportResponseDto;
import com.manganetworking.service.work.dto.ModerateCommentRequestDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ModerationApplicationService moderationService;
    private final WorkCommentService commentService;

    public ReportController(ModerationApplicationService moderationService, WorkCommentService commentService) {
        this.moderationService = moderationService;
        this.commentService = commentService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submitReport(
            @Valid @RequestBody CreateReportRequestDto dto
    ) {
        // Denúncia é pública: identificamos o autor apenas pela sessão (anônimo quando ausente),
        // nunca por header controlado pelo cliente.
        UUID reporterUserId = SecurityContextUtils.resolveCurrentUserId(null);
        ReportEntity report = moderationService.submitReport(reporterUserId, dto);
        return ResponseEntity.ok(Map.of(
                "reportId", report.getId(),
                "status", report.getStatus(),
                "message", "Denúncia recebida com sucesso. Nossa equipe editorial analisará o conteúdo."
        ));
    }

    /**
     * Lista denúncias pendentes para a fila editorial de moderação (Backoffice)
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<List<PendingReportResponseDto>> getPendingReports() {
        return ResponseEntity.ok(moderationService.getPendingReports());
    }

    /**
     * Suspensão cautelar imediata de obra denunciada (Violação Autoral ou Hentai/Pornografia)
     */
    @PostMapping("/moderate/suspend/{workId}")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Map<String, String>> suspendWork(
            @PathVariable UUID workId,
            @Valid @RequestBody(required = false) ModerationActionRequestDto request
    ) {
        String reason = request != null && request.reason() != null
                ? request.reason()
                : "Violação dos Termos de Uso / Pirataria";
        moderationService.suspendWork(workId, reason);
        return ResponseEntity.ok(Map.of("message", "Obra suspensa com sucesso"));
    }

    /**
     * Arquivamento / Rejeição de denúncia improcedente
     */
    @PostMapping("/moderate/dismiss/{reportId}")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Map<String, String>> dismissReport(
            @PathVariable UUID reportId,
            @Valid @RequestBody(required = false) ModerationActionRequestDto request
    ) {
        String notes = request != null && request.notes() != null
                ? request.notes()
                : "Denúncia analisada e arquivada pela moderação.";
        moderationService.dismissReport(reportId, notes);
        return ResponseEntity.ok(Map.of("message", "Denúncia arquivada com sucesso"));
    }

    /** Fila de denúncias de comentários (texto), separada da fila de obras. */
    @GetMapping("/comments/pending")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<List<CommentReportResponseDto>> getPendingCommentReports() {
        return ResponseEntity.ok(commentService.listPendingReports());
    }

    /** DISMISS arquiva a denúncia; HIDE oculta o comentário e recalcula contadores. */
    @PostMapping("/comments/{reportId}/moderate")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Map<String, String>> moderateComment(
            @PathVariable UUID reportId,
            @Valid @RequestBody ModerateCommentRequestDto request
    ) {
        commentService.moderateReport(reportId, request.action(), request.notes());
        return ResponseEntity.ok(Map.of("message", "Denúncia de comentário analisada."));
    }
}
