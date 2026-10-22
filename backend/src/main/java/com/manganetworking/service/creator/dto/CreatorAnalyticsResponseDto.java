package com.manganetworking.service.creator.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Dados editoriais do painel do criador.
 *
 * <p><b>Origem real:</b> eventos {@code READ} gravados em {@code engagement_events} e lançamentos
 * do {@code financial_ledger}. Não há valor mock: obra sem leitura aparece com zero.</p>
 *
 * <p>A resposta traz a visão geral do canal ({@code totals}, série diária, retenção e financeiro)
 * e a subdivisão por obra/capítulo ({@code works}) — o mesmo recorte de um painel de vídeo,
 * adaptado para mangá: a "obra" é o conteúdo principal e o "capítulo" é o episódio.</p>
 */
public record CreatorAnalyticsResponseDto(
        int windowDays,
        LocalDate from,
        LocalDate to,
        List<DailyReadsDto> readsPerDay,
        List<PageRetentionDto> pageRetention,
        BigDecimal netDonationsBrl,
        BigDecimal netMembershipsBrl,
        BigDecimal netWithdrawalsBrl,
        BigDecimal netEarningsBrl,
        BigDecimal walletBalanceBrl,
        int monthlyMembersCount,
        TotalsDto totals,
        List<HourlyReadsDto> readsLast48Hours,
        List<WorkAnalyticsDto> works
) {

    /** Leituras (page reads) e leitores únicos por dia. */
    public record DailyReadsDto(LocalDate date, long reads, long uniqueReaders) {}

    /**
     * Retenção por página: quantos leitores chegaram até a página {@code page}.
     * {@code retentionPercent} é relativo ao total de leitores da janela.
     */
    public record PageRetentionDto(int page, long readers, double retentionPercent) {}

    /** Total da janela selecionada (leitores únicos distintos, não a soma dos dias). */
    public record TotalsDto(long reads, long uniqueReaders) {}

    /** Leituras por hora nas últimas 48 horas (painel em tempo real). */
    public record HourlyReadsDto(Instant hour, long reads) {}

    /** Desempenho de uma obra no período, com o recorte de cada capítulo. */
    public record WorkAnalyticsDto(
            String workId,
            String title,
            String slug,
            String coverUrl,
            String status,
            long reads,
            long uniqueReaders,
            List<ChapterAnalyticsDto> chapters
    ) {}

    /** Desempenho de um capítulo no período. */
    public record ChapterAnalyticsDto(
            String chapterId,
            int chapterNumber,
            String title,
            long reads,
            long uniqueReaders
    ) {}
}
