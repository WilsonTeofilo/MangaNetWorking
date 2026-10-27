package com.manganetworking.service.creator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Agregador e calculador matemático puro para séries temporais e engajamento do criador.
 *
 * <p>Isola a lógica analítica (retenção, séries diárias/horárias, atribuição de funil e matriz
 * de heatmap) desacoplando a camada de persistência e orquestração.</p>
 */
@Component
public class CreatorAnalyticsSeriesAggregator {

    public static final int MAX_RETENTION_PAGES = 200;
    public static final int REALTIME_HOURS = 48;
    public static final int HEATMAP_DAYS = 28;
    public static final double COMPLETION_THRESHOLD = 0.80;
    public static final Duration ATTRIBUTION_WINDOW = Duration.ofMinutes(30);
    public static final ZoneId DISPLAY_ZONE = ZoneId.of("America/Sao_Paulo");

    private static final ObjectMapper JSON = new ObjectMapper();

    public CreatorAnalyticsResponseDto.TotalsDto calculateTotals(
            List<EngagementEventDocument> views,
            long impressions,
            long openings,
            long attributedOpenings
    ) {
        long uniqueReaders = views.stream()
                .map(EngagementEventDocument::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        return new CreatorAnalyticsResponseDto.TotalsDto(
                views.size(),
                uniqueReaders,
                impressions,
                openings,
                attributedOpenings,
                percent(attributedOpenings, impressions)
        );
    }

    public Map<String, Long> countAttributedOpenings(
            List<EngagementEventDocument> openings,
            List<EngagementEventDocument> impressions
    ) {
        Map<String, List<Instant>> impressionTimes = new HashMap<>();
        for (EngagementEventDocument impression : impressions) {
            if (impression.getTimestamp() == null) {
                continue;
            }
            impressionTimes.computeIfAbsent(attributionKey(impression), key -> new ArrayList<>())
                    .add(impression.getTimestamp());
        }
        impressionTimes.values().forEach(times -> times.sort(Comparator.naturalOrder()));

        Map<String, Long> attributedByWork = new HashMap<>();
        for (EngagementEventDocument opening : openings) {
            if (opening.getTimestamp() == null || opening.getWorkId() == null) {
                continue;
            }
            List<Instant> times = impressionTimes.get(attributionKey(opening));
            if (times == null || !hasImpressionWithinWindow(times, opening.getTimestamp())) {
                continue;
            }
            attributedByWork.merge(opening.getWorkId(), 1L, Long::sum);
        }
        return attributedByWork;
    }

    public boolean hasImpressionWithinWindow(List<Instant> sortedTimes, Instant openingAt) {
        int index = Collections.binarySearch(sortedTimes, openingAt);
        if (index < 0) {
            index = -index - 2;
        }
        while (index >= 0 && sortedTimes.get(index).isAfter(openingAt)) {
            index--;
        }
        if (index < 0) {
            return false;
        }
        Instant floor = openingAt.minus(ATTRIBUTION_WINDOW);
        return !sortedTimes.get(index).isBefore(floor);
    }

    public List<CreatorAnalyticsResponseDto.DailyViewsDto> buildDailySeries(
            List<EngagementEventDocument> views,
            LocalDate from,
            LocalDate to
    ) {
        Map<LocalDate, List<EngagementEventDocument>> byDay = views.stream()
                .filter(e -> e.getTimestamp() != null)
                .collect(Collectors.groupingBy(e ->
                        e.getTimestamp().atZone(DISPLAY_ZONE).toLocalDate()));

        List<CreatorAnalyticsResponseDto.DailyViewsDto> series = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            List<EngagementEventDocument> dayEvents = byDay.getOrDefault(day, List.of());
            long uniqueReaders = dayEvents.stream()
                    .map(EngagementEventDocument::getUserId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();
            series.add(new CreatorAnalyticsResponseDto.DailyViewsDto(day, dayEvents.size(), uniqueReaders));
        }
        return series;
    }

    public CreatorAnalyticsResponseDto.ComparisonDto buildComparison(
            List<EngagementEventDocument> previousViews,
            LocalDate previousFrom,
            LocalDate previousTo
    ) {
        Map<LocalDate, Long> byDay = previousViews.stream()
                .filter(e -> e.getTimestamp() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getTimestamp().atZone(DISPLAY_ZONE).toLocalDate(),
                        Collectors.counting()));

        List<CreatorAnalyticsResponseDto.DailyComparisonDto> series = new ArrayList<>();
        for (LocalDate day = previousFrom; !day.isAfter(previousTo); day = day.plusDays(1)) {
            series.add(new CreatorAnalyticsResponseDto.DailyComparisonDto(
                    day, byDay.getOrDefault(day, 0L)));
        }
        long uniqueReaders = previousViews.stream()
                .map(EngagementEventDocument::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .count();
        return new CreatorAnalyticsResponseDto.ComparisonDto(
                previousFrom, previousTo, previousViews.size(), uniqueReaders, series);
    }

    public List<CreatorAnalyticsResponseDto.HourlyViewsDto> buildHourlySeries(
            List<EngagementEventDocument> views,
            Instant now
    ) {
        Instant firstHour = now.minus(REALTIME_HOURS, ChronoUnit.HOURS).truncatedTo(ChronoUnit.HOURS);
        Map<Instant, Long> byHour = views.stream()
                .filter(e -> e.getTimestamp() != null)
                .collect(Collectors.groupingBy(
                        e -> e.getTimestamp().truncatedTo(ChronoUnit.HOURS),
                        Collectors.counting()));

        List<CreatorAnalyticsResponseDto.HourlyViewsDto> series = new ArrayList<>(REALTIME_HOURS);
        for (int i = 0; i < REALTIME_HOURS; i++) {
            Instant hour = firstHour.plus(i, ChronoUnit.HOURS);
            series.add(new CreatorAnalyticsResponseDto.HourlyViewsDto(hour, byHour.getOrDefault(hour, 0L)));
        }
        return series;
    }

    public List<CreatorAnalyticsResponseDto.PageRetentionDto> buildPageRetention(
            List<EngagementEventDocument> events
    ) {
        Map<String, Integer> maxPageByReader = new HashMap<>();
        for (EngagementEventDocument event : events) {
            if (event.getUserId() == null || event.getReadPage() == null) {
                continue;
            }
            maxPageByReader.merge(event.getUserId(), event.getReadPage(), Math::max);
        }

        if (maxPageByReader.isEmpty()) {
            return List.of();
        }

        int maxPage = maxPageByReader.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        int pages = Math.min(maxPage, MAX_RETENTION_PAGES);
        long totalReaders = maxPageByReader.size();

        int[] readersStoppingAtPage = new int[pages + 1];
        for (int lastPage : maxPageByReader.values()) {
            readersStoppingAtPage[Math.min(lastPage, pages)]++;
        }

        long[] readersReachingPage = new long[pages + 1];
        long running = 0;
        for (int page = pages; page >= 1; page--) {
            running += readersStoppingAtPage[page];
            readersReachingPage[page] = running;
        }

        List<CreatorAnalyticsResponseDto.PageRetentionDto> retention = new ArrayList<>(pages);
        for (int page = 1; page <= pages; page++) {
            long readers = readersReachingPage[page];
            double percentValue = (readers * 100.0) / totalReaders;
            retention.add(new CreatorAnalyticsResponseDto.PageRetentionDto(
                    page,
                    readers,
                    BigDecimal.valueOf(percentValue).setScale(1, RoundingMode.HALF_UP).doubleValue()
            ));
        }
        return retention;
    }

    public CreatorAnalyticsResponseDto.AudienceHeatmapDto buildAudienceHeatmap(
            List<EngagementEventDocument> recentViews
    ) {
        long[][] matrix = new long[8][24];
        for (EngagementEventDocument view : recentViews) {
            if (view.getTimestamp() == null) {
                continue;
            }
            var local = view.getTimestamp().atZone(DISPLAY_ZONE);
            matrix[local.getDayOfWeek().getValue()][local.getHour()]++;
        }

        List<CreatorAnalyticsResponseDto.HeatmapCellDto> cells = new ArrayList<>(7 * 24);
        for (int weekday = 1; weekday <= 7; weekday++) {
            for (int hour = 0; hour < 24; hour++) {
                cells.add(new CreatorAnalyticsResponseDto.HeatmapCellDto(
                        weekday, hour, matrix[weekday][hour]));
            }
        }
        return new CreatorAnalyticsResponseDto.AudienceHeatmapDto(
                DISPLAY_ZONE.getId(), HEATMAP_DAYS, recentViews.size(), cells);
    }

    public CreatorAnalyticsResponseDto.FunnelDto buildFunnel(
            long impressions,
            long openings,
            long attributedOpenings,
            long qualifiedStarts,
            List<CreatorAnalyticsResponseDto.WorkAnalyticsDto> works
    ) {
        long completedStarts = 0;
        boolean anyMeasurable = false;
        for (CreatorAnalyticsResponseDto.WorkAnalyticsDto work : works) {
            for (CreatorAnalyticsResponseDto.ChapterAnalyticsDto chapter : work.chapters()) {
                if (chapter.completionRatePercent() != null) {
                    anyMeasurable = true;
                    completedStarts += chapter.completedReaders();
                }
            }
        }
        return new CreatorAnalyticsResponseDto.FunnelDto(
                impressions,
                openings,
                attributedOpenings,
                qualifiedStarts,
                anyMeasurable ? completedStarts : null
        );
    }

    public long completedReaders(
            List<EngagementEventDocument> chapterReads,
            int pages,
            Set<String> viewerIds
    ) {
        if (chapterReads.isEmpty() || viewerIds.isEmpty()) {
            return 0;
        }
        int threshold = (int) Math.ceil(pages * COMPLETION_THRESHOLD);
        Map<String, Integer> maxPageByReader = new HashMap<>();
        for (EngagementEventDocument read : chapterReads) {
            if (read.getUserId() == null
                    || read.getReadPage() == null
                    || !viewerIds.contains(read.getUserId())) {
                continue;
            }
            maxPageByReader.merge(read.getUserId(), read.getReadPage(), Math::max);
        }
        return maxPageByReader.values().stream().filter(page -> page >= threshold).count();
    }

    public int mangaPageCount(ChapterEntity chapter) {
        if (chapter.getFormat() == ChapterFormat.PROSE || chapter.getPagesJson() == null) {
            return 0;
        }
        try {
            JsonNode pages = JSON.readTree(chapter.getPagesJson());
            return pages != null && pages.isArray() ? pages.size() : 0;
        } catch (Exception malformed) {
            return 0;
        }
    }

    public Double percent(long numerator, long denominator) {
        if (denominator <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerator * 100.0 / denominator)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private String attributionKey(EngagementEventDocument event) {
        return event.getWorkId() + "|" + event.getUserId();
    }
}
