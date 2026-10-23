package com.manganetworking.service.creator;

import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;

/**
 * Gera o CSV agregado do painel (mesmos filtros e números da tela).
 *
 * <p>Sem eventos brutos e sem identidade de leitor: apenas totais por obra e por capítulo.
 * Toda célula é citada e neutralizada contra formula injection (conteúdo iniciado por
 * {@code =}, {@code +}, {@code -}, {@code @}, tab ou CR recebe um apóstrofo).</p>
 */
public final class CreatorAnalyticsCsvWriter {

    private static final String LINE_END = "\r\n";
    private static final String HEADER = String.join(",",
            "Secao", "Obra", "Slug", "Status", "Capitulo", "Numero",
            "Visualizacoes", "LeitoresUnicos", "Impressoes", "AberturasAtribuidas",
            "CTR", "IniciosQualificados", "Conclusao");

    private CreatorAnalyticsCsvWriter() {}

    public static String write(CreatorAnalyticsResponseDto analytics, Instant generatedAt) {
        Objects.requireNonNull(analytics, "analytics");

        StringBuilder csv = new StringBuilder();
        csv.append("# MangaNetWorking - Analytics do criador").append(LINE_END);
        csv.append("# Periodo,").append(cell(analytics.from())).append(',')
                .append(cell(analytics.to())).append(LINE_END);
        csv.append("# Janela em dias,").append(cell(analytics.windowDays())).append(LINE_END);
        if (analytics.comparison() != null) {
            csv.append("# Comparacao,").append(cell(analytics.comparison().from())).append(',')
                    .append(cell(analytics.comparison().to())).append(LINE_END);
        }
        csv.append("# Fuso de exibicao,").append(cell(
                analytics.audienceHeatmap() == null ? "America/Sao_Paulo"
                        : analytics.audienceHeatmap().timezone())).append(LINE_END);
        csv.append("# Gerado em (UTC),").append(cell(generatedAt)).append(LINE_END);
        csv.append(HEADER).append(LINE_END);

        CreatorAnalyticsResponseDto.TotalsDto totals = analytics.totals();
        if (totals != null) {
            csv.append(row(
                    "Resumo", "", "", "", "", "",
                    totals.views(),
                    totals.uniqueReaders(),
                    totals.impressions(),
                    totals.attributedOpenings(),
                    percentCell(totals.ctrPercent()),
                    totals.views(),
                    analytics.funnel() == null ? null : analytics.funnel().completions()
            )).append(LINE_END);
        }

        if (analytics.works() != null) {
            for (CreatorAnalyticsResponseDto.WorkAnalyticsDto work : analytics.works()) {
                csv.append(row(
                        "Obra", work.title(), work.slug(), work.status(), "", "",
                        work.views(),
                        work.uniqueReaders(),
                        work.impressions(),
                        work.attributedOpenings(),
                        percentCell(work.ctrPercent()),
                        work.views(),
                        percentCell(work.completionRatePercent())
                )).append(LINE_END);

                for (CreatorAnalyticsResponseDto.ChapterAnalyticsDto chapter : work.chapters()) {
                    csv.append(row(
                            "Capitulo", work.title(), work.slug(), work.status(),
                            chapter.title(), chapter.chapterNumber(),
                            chapter.views(),
                            chapter.uniqueReaders(),
                            // Impressão é do card da obra; no capítulo é ausente, não zero.
                            null,
                            null,
                            null,
                            chapter.views(),
                            percentCell(chapter.completionRatePercent())
                    )).append(LINE_END);
                }
            }
        }
        return csv.toString();
    }

    private static String row(Object... cells) {
        StringBuilder line = new StringBuilder();
        for (int index = 0; index < cells.length; index++) {
            if (index > 0) {
                line.append(',');
            }
            line.append(cell(cells[index]));
        }
        return line.toString();
    }

    private static String percentCell(Double value) {
        if (value == null) {
            return null;
        }
        return String.format(Locale.ROOT, "%.1f", value);
    }

    /**
     * Célula sempre citada. Remove controles invisíveis (preservando tab/CR/LF dentro de
     * aspas) e prefixa apóstrofo quando o primeiro caractere pode iniciar fórmula.
     */
    static String cell(Object raw) {
        if (raw == null) {
            return "\"\"";
        }
        String text = String.valueOf(raw)
                .replaceAll("[\\p{Cntrl}&&[^\\t\\r\\n]]", "");
        if (!text.isEmpty() && "=+-@\t\r".indexOf(text.charAt(0)) >= 0) {
            text = "'" + text;
        }
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }
}
