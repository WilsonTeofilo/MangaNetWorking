package com.manganetworking.service.creator;

import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CreatorAnalyticsSeriesAggregatorTest {

    private CreatorAnalyticsSeriesAggregator aggregator;

    @BeforeEach
    void setUp() {
        aggregator = new CreatorAnalyticsSeriesAggregator();
    }

    @Test
    @DisplayName("calculateTotals calcula visualizações e leitores únicos sem duplicação")
    void calculateTotals_computesCorrectly() {
        EngagementEventDocument v1 = new EngagementEventDocument();
        v1.setUserId("user1");
        EngagementEventDocument v2 = new EngagementEventDocument();
        v2.setUserId("user1");
        EngagementEventDocument v3 = new EngagementEventDocument();
        v3.setUserId("user2");

        CreatorAnalyticsResponseDto.TotalsDto totals = aggregator.calculateTotals(
                List.of(v1, v2, v3), 100L, 20L, 10L
        );

        assertThat(totals.views()).isEqualTo(3);
        assertThat(totals.uniqueReaders()).isEqualTo(2);
        assertThat(totals.impressions()).isEqualTo(100L);
        assertThat(totals.openings()).isEqualTo(20L);
        assertThat(totals.attributedOpenings()).isEqualTo(10L);
        assertThat(totals.ctrPercent()).isEqualTo(10.0);
    }

    @Test
    @DisplayName("percent retorna null com denominador zero e arredonda com 1 casa decimal")
    void percent_handlesZeroAndScale() {
        assertThat(aggregator.percent(10, 0)).isNull();
        assertThat(aggregator.percent(1, 3)).isEqualTo(33.3);
        assertThat(aggregator.percent(2, 3)).isEqualTo(66.7);
    }

    @Test
    @DisplayName("countAttributedOpenings atribui apenas com impressão dentro da janela de 30 minutos")
    void countAttributedOpenings_withinWindow() {
        Instant now = Instant.parse("2026-10-26T20:00:00Z");

        EngagementEventDocument impression = new EngagementEventDocument();
        impression.setWorkId("work-1");
        impression.setUserId("user-1");
        impression.setTimestamp(now.minusSeconds(600)); // 10 min antes

        EngagementEventDocument opening = new EngagementEventDocument();
        opening.setWorkId("work-1");
        opening.setUserId("user-1");
        opening.setTimestamp(now);

        Map<String, Long> attributed = aggregator.countAttributedOpenings(
                List.of(opening), List.of(impression)
        );

        assertThat(attributed).containsEntry("work-1", 1L);
    }

    @Test
    @DisplayName("buildDailySeries preenche dias vazios com zero visualizações")
    void buildDailySeries_fillsMissingDaysWithZero() {
        LocalDate from = LocalDate.of(2026, 10, 20);
        LocalDate to = LocalDate.of(2026, 10, 22);

        List<CreatorAnalyticsResponseDto.DailyViewsDto> series = aggregator.buildDailySeries(List.of(), from, to);

        assertThat(series).hasSize(3);
        assertThat(series).allMatch(d -> d.views() == 0 && d.uniqueReaders() == 0);
    }

    @Test
    @DisplayName("completedReaders respeita o threshold de 80% e início qualificado")
    void completedReaders_respects80Percent() {
        EngagementEventDocument read1 = new EngagementEventDocument();
        read1.setUserId("user-1");
        read1.setReadPage(8); // 8 de 10 = 80%

        EngagementEventDocument read2 = new EngagementEventDocument();
        read2.setUserId("user-2");
        read2.setReadPage(7); // 7 de 10 = 70%

        long completed = aggregator.completedReaders(
                List.of(read1, read2), 10, Set.of("user-1", "user-2")
        );

        assertThat(completed).isEqualTo(1);
    }
}
