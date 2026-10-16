package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.mobile.MobileOfflineApplicationService;
import com.manganetworking.service.mobile.dto.OfflineDownloadManifestDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/mobile/offline")
public class MobileOfflineController {

    private final MobileOfflineApplicationService mobileOfflineService;

    public MobileOfflineController(MobileOfflineApplicationService mobileOfflineService) {
        this.mobileOfflineService = mobileOfflineService;
    }

    /**
     * Endpoint Móvel: Emissão de manifesto de download offline para assinantes VIP da plataforma.
     * Retorna lista de páginas e instrução obrigatória de FLAG_SECURE para prevenção de vazamento e prints.
     * O usuário é resolvido exclusivamente pela sessão autenticada (nunca por header controlado pelo cliente).
     */
    @GetMapping("/download-manifest/{chapterId}")
    public ResponseEntity<OfflineDownloadManifestDto> getDownloadManifest(@PathVariable UUID chapterId) {
        // Identidade exclusivamente da sessão; sem sessão o serviço nega o acesso (nunca header do cliente).
        UUID authenticatedUserId = SecurityContextUtils.requireCurrentUserId();
        OfflineDownloadManifestDto manifest = mobileOfflineService.generateOfflineManifest(authenticatedUserId, chapterId);
        return ResponseEntity.ok(manifest);
    }
}
