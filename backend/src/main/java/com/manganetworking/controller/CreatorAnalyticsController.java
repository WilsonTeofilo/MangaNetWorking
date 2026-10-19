package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.creator.CreatorAnalyticsApplicationService;
import com.manganetworking.service.creator.SeasonService;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import com.manganetworking.service.creator.dto.SeasonStatusResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Painel editorial do criador: analytics de leitura/financeiro e estado da Season de 60 dias.
 * A identidade vem sempre da sessão autenticada, nunca de um id enviado pelo cliente.
 */
@RestController
@RequestMapping("/api/creators")
public class CreatorAnalyticsController {

    private final CreatorAnalyticsApplicationService analyticsService;
    private final SeasonService seasonService;

    public CreatorAnalyticsController(
            CreatorAnalyticsApplicationService analyticsService,
            SeasonService seasonService
    ) {
        this.analyticsService = analyticsService;
        this.seasonService = seasonService;
    }

    @GetMapping("/analytics")
    public ResponseEntity<CreatorAnalyticsResponseDto> getAnalytics(
            @RequestParam(name = "days", defaultValue = "30") int days
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        return ResponseEntity.ok(analyticsService.getAnalytics(creatorId, days));
    }

    @GetMapping("/season")
    public ResponseEntity<SeasonStatusResponseDto> getSeasonStatus() {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        return ResponseEntity.ok(seasonService.getStatus(creatorId));
    }
}
