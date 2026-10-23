package com.manganetworking.service.creator.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Dados editoriais do painel do criador.
 *
 * <p><b>Origem real:</b> eventos {@code VIEW} (visualização = leitor que leu a primeira
 * página de um capítulo, 1 por leitor por capítulo), {@code READ} (páginas lidas, usadas
 * na retenção), {@code IMPRESSION}/{@code OPEN} (funil de descoberta) em
 * {@code engagement_events}, mais os lançamentos do {@code financial_ledger}. Não há
 * valor mock: obra sem leitura aparece com zero; métrica sem instrumentação aparece como
 * ausente ({@code null}), nunca como zero.</p>
 *
 * <p>A resposta traz a visão geral do canal ({@code totals}, série diária, retenção e
 * financeiro), a comparação com o período anterior de mesma duração, o funil de
 * descoberta, o heatmap de audiência dos últimos 28 dias e a subdivisão por obra/capítulo.</p>
 */
public record CreatorAnalyticsResponseDto(
        int windowDays,
        LocalDate from,
        LocalDate to,
        List<DailyViewsDto> viewsPerDay,
        List<PageRetentionDto> pageRetention,
        BigDecimal netDonationsBrl,
        BigDecimal netMembershipsBrl,
        BigDecimal netWithdrawalsBrl,
        BigDecimal netEarningsBrl,
        BigDecimal walletBalanceBrl,
        int monthlyMembersCount,
        TotalsDto totals,
        List<HourlyViewsDto> viewsLast48Hours,
        List<WorkAnalyticsDto> works,
        ComparisonDto comparison,
        FunnelDto funnel,
        AudienceHeatmapDto audienceHeatmap
) {

    /** Visualizações e leitores únicos por dia. */
    public record DailyViewsDto(LocalDate date, long views, long uniqueReaders) {}

    /**
     * Retenção por página: quantos leitores com progresso registrado chegaram até a
     * página {@code page}. {@code retentionPercent} usa esse mesmo grupo como denominador
     * (não é "inícios qualificados" por capítulo — ver docs/ANALYTICS-METRICAS.md).
     */
    public record PageRetentionDto(int page, long readers, double retentionPercent) {}

    /**
     * Total da janela selecionada. {@code uniqueReaders} é distinto na janela, nunca a
     * soma dos dias. {@code impressions}, {@code openings} e {@code attributedOpenings}
     * vêm da instrumentação de descoberta; {@code ctrPercent} é nulo quando não houve
     * impressão elegível (indisponível, não zero).
     */
    public record TotalsDto(
            long views,
            long uniqueReaders,
            long impressions,
            long openings,
            long attributedOpenings,
            Double ctrPercent
    ) {}

    /** Visualizações por hora nas últimas 48 horas (painel em tempo real). */
    public record HourlyViewsDto(Instant hour, long views) {}

    /** Período imediatamente anterior, com a mesma duração, para comparação honesta. */
    public record ComparisonDto(
            LocalDate from,
            LocalDate to,
            long views,
            long uniqueReaders,
            List<DailyComparisonDto> viewsPerDay
    ) {}

    public record DailyComparisonDto(LocalDate date, long views) {}

    /**
     * Funil de descoberta. Só contém etapas medidas; {@code completions} é nulo quando a
     * conclusão ainda não é mensurável no formato (ex.: prosa sem checkpoint de progresso).
     */
    public record FunnelDto(
            long impressions,
            long openings,
            long attributedOpenings,
            long qualifiedStarts,
            Long completions
    ) {}

    /**
     * Quando a audiência lê: matriz dia da semana × hora, últimos 28 dias, no fuso
     * {@code America/Sao_Paulo}. {@code sampleSize} é o número de visualizações usadas;
     * abaixo do limiar de privacidade a UI não detalha os pontos.
     */
    public record AudienceHeatmapDto(
            String timezone,
            int days,
            long sampleSize,
            List<HeatmapCellDto> cells
    ) {}

    /** {@code weekday} segue ISO: 1 = segunda, 7 = domingo. {@code hour} = 0..23. */
    public record HeatmapCellDto(int weekday, int hour, long views) {}

    /** Desempenho de uma obra no período, com o recorte de cada capítulo. */
    public record WorkAnalyticsDto(
            String workId,
            String title,
            String slug,
            String coverUrl,
            String status,
            long views,
            long uniqueReaders,
            List<ChapterAnalyticsDto> chapters,
            long impressions,
            long attributedOpenings,
            Double ctrPercent,
            Double completionRatePercent,
            long completedReaders
    ) {}

    /**
     * Desempenho de um capítulo no período. {@code views} é o início qualificado
     * (primeira página efetivamente lida). {@code completionRatePercent} é nulo para
     * prosa enquanto não houver checkpoint de progresso de prosa.
     */
    public record ChapterAnalyticsDto(
            String chapterId,
            int chapterNumber,
            String title,
            long views,
            long uniqueReaders,
            Double completionRatePercent,
            long completedReaders
    ) {}
}
