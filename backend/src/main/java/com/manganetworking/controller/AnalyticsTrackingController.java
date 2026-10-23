package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.analytics.EngagementTrackingService;
import com.manganetworking.service.analytics.dto.TrackImpressionRequestDto;
import com.manganetworking.service.analytics.dto.TrackOpeningRequestDto;
import com.manganetworking.service.analytics.dto.TrackingAckDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Tracking first-party mínimo de descoberta.
 *
 * <p>Somente leitor autenticado é rastreado (a rota cai na regra
 * {@code anyRequest().authenticated()}). Não há identificador anônimo, fingerprint,
 * IP, e-mail ou texto lido: o servidor deriva o usuário da sessão e carimba o horário.</p>
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsTrackingController {

    private final EngagementTrackingService trackingService;

    public AnalyticsTrackingController(EngagementTrackingService trackingService) {
        this.trackingService = trackingService;
    }

    /**
     * Impressões são enviadas em lote (máx. 20 por chamada) para não consumir o rate
     * limit global com um POST por card.
     */
    @PostMapping("/impressions")
    public ResponseEntity<TrackingAckDto> trackImpressions(
            @Valid @RequestBody TrackImpressionRequestDto request
    ) {
        String userId = SecurityContextUtils.requireCurrentUserId().toString();
        return ResponseEntity.ok(trackingService.trackImpressions(userId, request));
    }

    @PostMapping("/openings")
    public ResponseEntity<TrackingAckDto> trackOpening(
            @Valid @RequestBody TrackOpeningRequestDto request
    ) {
        String userId = SecurityContextUtils.requireCurrentUserId().toString();
        return ResponseEntity.ok(trackingService.trackOpening(userId, request));
    }
}
