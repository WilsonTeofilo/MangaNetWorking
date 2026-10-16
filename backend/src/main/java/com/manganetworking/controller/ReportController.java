package com.manganetworking.controller;

import com.manganetworking.domain.relational.ReportEntity;
import com.manganetworking.service.moderation.ModerationApplicationService;
import com.manganetworking.service.moderation.dto.CreateReportRequestDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ModerationApplicationService moderationService;

    public ReportController(ModerationApplicationService moderationService) {
        this.moderationService = moderationService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> submitReport(
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID reporterUserId,
            @Valid @RequestBody CreateReportRequestDto dto
    ) {
        ReportEntity report = moderationService.submitReport(reporterUserId, dto);
        return ResponseEntity.ok(Map.of(
                "reportId", report.getId(),
                "status", report.getStatus(),
                "message", "Denúncia recebida com sucesso. Nossa equipe editorial analisará o conteúdo."
        ));
    }

    @PostMapping("/moderate/suspend/{workId}")
    public ResponseEntity<Map<String, String>> suspendWork(
            @PathVariable UUID workId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        String reason = (body != null && body.containsKey("reason")) ? body.get("reason") : "Violação dos Termos de Uso / Pirataria";
        moderationService.suspendWork(workId, reason);
        return ResponseEntity.ok(Map.of("message", "Obra suspensa com sucesso"));
    }
}
