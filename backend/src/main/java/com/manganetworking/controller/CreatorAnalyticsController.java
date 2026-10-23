package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.creator.CreatorAnalyticsApplicationService;
import com.manganetworking.service.creator.CreatorAnalyticsCsvWriter;
import com.manganetworking.service.creator.SeasonService;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import com.manganetworking.service.creator.dto.SeasonStatusResponseDto;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

/**
 * Painel editorial do criador: analytics de leitura/financeiro e estado da Season de 60 dias.
 * A identidade vem sempre da sessão autenticada, nunca de um id enviado pelo cliente —
 * inclusive na exportação: não existe parâmetro {@code creatorId}, {@code workId} ou
 * {@code chapterId} que possa ampliar o escopo.
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
            @RequestParam(name = "days", defaultValue = "28") int days
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        return ResponseEntity.ok(analyticsService.getAnalytics(creatorId, days));
    }

    /**
     * Exportação server-side do relatório agregado. Usa exatamente o mesmo serviço da tela
     * e neutraliza formula injection; não inclui evento bruto nem identidade de leitor.
     */
    @GetMapping(value = "/analytics/export.csv", produces = "text/csv;charset=UTF-8")
    public ResponseEntity<byte[]> exportAnalyticsCsv(
            @RequestParam(name = "days", defaultValue = "28") int days
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        CreatorAnalyticsResponseDto analytics = analyticsService.getAnalytics(creatorId, days);
        String csv = CreatorAnalyticsCsvWriter.write(analytics, Instant.now());

        byte[] body = ("\uFEFF" + csv).getBytes(StandardCharsets.UTF_8);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
        headers.set(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"analytics-" + analytics.from() + "-a-" + analytics.to() + ".csv\"");
        headers.setCacheControl("no-store");
        return ResponseEntity.ok().headers(headers).body(body);
    }

    @GetMapping("/season")
    public ResponseEntity<SeasonStatusResponseDto> getSeasonStatus() {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        return ResponseEntity.ok(seasonService.getStatus(creatorId));
    }
}
