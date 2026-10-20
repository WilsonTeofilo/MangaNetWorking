package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.user.LegacyPersonalDataService;
import com.manganetworking.service.user.dto.LegacyPersonalDataReport;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Governança de dados do proprietário (item 48 do roadmap).
 * <p>
 * Exclusivo de {@code ROLE_OWNER}: a autorização é resolvida no servidor e nunca vem do cliente.
 * O saneamento de dados legados é sempre simulação ({@code dry-run}) por padrão; a mutação
 * exige pedido explícito e fica registrada em auditoria append-only.
 * </p>
 */
@RestController
@RequestMapping("/api/owner/privacy")
@PreAuthorize("hasRole('OWNER')")
public class OwnerPrivacyController {

    private final LegacyPersonalDataService legacyPersonalDataService;

    public OwnerPrivacyController(LegacyPersonalDataService legacyPersonalDataService) {
        this.legacyPersonalDataService = legacyPersonalDataService;
    }

    /** Relatório de dados legados (CPF sentinela/inválido) sem alterar nada. */
    @GetMapping("/legacy-personal-data")
    public ResponseEntity<LegacyPersonalDataReport> auditLegacyPersonalData() {
        return ResponseEntity.ok(legacyPersonalDataService.auditAndSanitize(currentActor(), false));
    }

    /**
     * Saneamento controlado. Por padrão executa apenas a simulação; com {@code apply=true}
     * remove o CPF inválido dos criadores que ainda não monetizam.
     */
    @PostMapping("/legacy-personal-data/sanitize")
    public ResponseEntity<LegacyPersonalDataReport> sanitizeLegacyPersonalData(
            @RequestBody(required = false) Map<String, Boolean> request
    ) {
        boolean apply = request != null && Boolean.TRUE.equals(request.get("apply"));
        return ResponseEntity.ok(legacyPersonalDataService.auditAndSanitize(currentActor(), apply));
    }

    private UUID currentActor() {
        return SecurityContextUtils.requireCurrentUserId();
    }
}
