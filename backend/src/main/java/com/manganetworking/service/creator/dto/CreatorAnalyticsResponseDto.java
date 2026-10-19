package com.manganetworking.service.creator.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Dados editoriais do painel do criador.
 *
 * <p><b>Origem real:</b> eventos {@code READ} gravados em {@code engagement_events} e lançamentos
 * do {@code financial_ledger}. Não há valor mock: obra sem leitura aparece com zero.</p>
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
        int monthlyMembersCount
) {

    /** Leituras (page reads) e leitores únicos por dia. */
    public record DailyReadsDto(LocalDate date, long reads, long uniqueReaders) {}

    /**
     * Retenção por página: quantos leitores chegaram até a página {@code page}.
     * {@code retentionPercent} é relativo ao total de leitores da janela.
     */
    public record PageRetentionDto(int page, long readers, double retentionPercent) {}
}
