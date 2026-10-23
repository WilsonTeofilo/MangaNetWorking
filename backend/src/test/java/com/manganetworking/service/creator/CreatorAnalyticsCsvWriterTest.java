package com.manganetworking.service.creator;

import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CreatorAnalyticsCsvWriterTest {

    private CreatorAnalyticsResponseDto analytics(String title, String chapterTitle, String slug) {
        CreatorAnalyticsResponseDto.ChapterAnalyticsDto chapter =
                new CreatorAnalyticsResponseDto.ChapterAnalyticsDto(
                        "chapter-1", 7, chapterTitle, 2, 1, 50.0, 1);
        CreatorAnalyticsResponseDto.WorkAnalyticsDto work =
                new CreatorAnalyticsResponseDto.WorkAnalyticsDto(
                        "work-1", title, slug, null, "ongoing",
                        2, 1, List.of(chapter), 10, 4, 40.0, 50.0, 1);
        return new CreatorAnalyticsResponseDto(
                28,
                LocalDate.of(2026, 9, 25),
                LocalDate.of(2026, 10, 22),
                List.of(),
                List.of(),
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                0,
                new CreatorAnalyticsResponseDto.TotalsDto(2, 1, 10, 4, 4, 40.0),
                List.of(),
                List.of(work),
                new CreatorAnalyticsResponseDto.ComparisonDto(
                        LocalDate.of(2026, 8, 28), LocalDate.of(2026, 9, 24), 0, 0, List.of()),
                new CreatorAnalyticsResponseDto.FunnelDto(10, 4, 4, 2, 1L),
                new CreatorAnalyticsResponseDto.AudienceHeatmapDto(
                        "America/Sao_Paulo", 28, 0, List.of())
        );
    }

    @Test
    @DisplayName("CSV neutraliza fórmula em qualquer célula e preserva acentos")
    void shouldNeutralizeFormulaInjection() {
        String csv = CreatorAnalyticsCsvWriter.write(
                analytics("=SUM(A1:A2)", "@cmd", "+slug"), Instant.parse("2026-10-22T12:00:00Z"));

        assertThat(csv).contains("\"'=SUM(A1:A2)\"");
        assertThat(csv).contains("\"'@cmd\"");
        assertThat(csv).contains("\"'+slug\"");
        assertThat(csv).contains("# MangaNetWorking - Analytics do criador");
        assertThat(csv).contains("# Fuso de exibicao,\"America/Sao_Paulo\"");
        assertThat(csv).contains("Secao,Obra,Slug");
    }

    @Test
    @DisplayName("CSV cita vírgula, aspas, quebra de linha e remove controle invisível")
    void shouldEscapeCommasQuotesAndControls() {
        String csv = CreatorAnalyticsCsvWriter.write(
                analytics("Obra \"Aspas\", com vírgula", "Ação\u0001 e linha\nnova", "slug"),
                Instant.parse("2026-10-22T12:00:00Z"));

        assertThat(csv).contains("\"Obra \"\"Aspas\"\", com vírgula\"");
        assertThat(csv).contains("\"Ação e linha\nnova\"");
        assertThat(csv).doesNotContain("\u0001");
    }

    @Test
    @DisplayName("CSV distingue ausente de zero e não inventa impressão por capítulo")
    void shouldKeepAbsentValuesEmpty() {
        CreatorAnalyticsResponseDto base = analytics("Obra", "Capítulo", "slug");
        CreatorAnalyticsResponseDto semConclusao = new CreatorAnalyticsResponseDto(
                base.windowDays(), base.from(), base.to(), base.viewsPerDay(), base.pageRetention(),
                base.netDonationsBrl(), base.netMembershipsBrl(), base.netWithdrawalsBrl(),
                base.netEarningsBrl(), base.walletBalanceBrl(), base.monthlyMembersCount(),
                new CreatorAnalyticsResponseDto.TotalsDto(0, 0, 0, 0, 0, null),
                base.viewsLast48Hours(),
                List.of(new CreatorAnalyticsResponseDto.WorkAnalyticsDto(
                        "work-1", "Obra", "slug", null, "ongoing",
                        0, 0, List.of(new CreatorAnalyticsResponseDto.ChapterAnalyticsDto(
                                "chapter-1", 1, "Prosa", 0, 0, null, 0)),
                        0, 0, null, null, 0)),
                base.comparison(),
                new CreatorAnalyticsResponseDto.FunnelDto(0, 0, 0, 0, null),
                base.audienceHeatmap()
        );

        String csv = CreatorAnalyticsCsvWriter.write(semConclusao, Instant.parse("2026-10-22T12:00:00Z"));
        // Impressão é da obra (card), não do capítulo: nas linhas de capítulo fica vazia.
        assertThat(csv).contains(
                "\"Capitulo\",\"Obra\",\"slug\",\"ongoing\",\"Prosa\",\"1\","
                        + "\"0\",\"0\",\"\",\"\",\"\",\"0\",\"\"");
    }
}
