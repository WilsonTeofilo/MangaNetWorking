package com.manganetworking.service.creator;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.FinancialLedgerEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Analytics editorial do criador.
 *
 * <p>Não fabrica dado: lê eventos reais de leitura/descoberta
 * ({@code engagement_events}) e o {@code financial_ledger}. Se não houver evento no
 * período, devolve série zerada; se uma métrica não foi instrumentada no formato,
 * devolve {@code null} em vez de zero.</p>
 *
 * <p><b>Contadores:</b> {@code VIEW} é a visualização válida (1 por leitor por capítulo,
 * gravada quando a primeira página é efetivamente alcançada) e também o início
 * qualificado; {@code READ} alimenta apenas a retenção; {@code IMPRESSION}/{@code OPEN}
 * formam o funil de descoberta. Páginas lidas nunca viram novas visualizações.</p>
 *
 * <p><b>Janela:</b> limitada a 180 dias porque a coleção tem TTL de 180 dias; pedir mais
 * devolveria dias vazios e daria a impressão de queda de audiência. Datas são UTC no
 * armazenamento; o heatmap de audiência é exibido em {@code America/Sao_Paulo}.</p>
 */
@Service
public class CreatorAnalyticsApplicationService {

    private static final int MIN_WINDOW_DAYS = 1;
    private static final int MAX_WINDOW_DAYS = 180;
    private static final int MAX_RETENTION_PAGES = 200;
    private static final int REALTIME_HOURS = 48;
    private static final int HEATMAP_DAYS = 28;
    private static final double COMPLETION_THRESHOLD = 0.80;
    /** Janela em que uma abertura ainda é atribuída a uma impressão recente. */
    private static final Duration ATTRIBUTION_WINDOW = Duration.ofMinutes(30);
    private static final ZoneId DISPLAY_ZONE = ZoneId.of("America/Sao_Paulo");
    private static final ObjectMapper JSON = new ObjectMapper();

    /** Visualização de capítulo: 1 por leitor por capítulo (não por página). */
    private static final String VIEW_EVENT = "VIEW";
    /** Página lida: alimenta a retenção, não a contagem de visualizações. */
    private static final String READ_EVENT = "READ";
    /** Card que entrou na área visível (≥50% por ~1s, regra do cliente). */
    private static final String IMPRESSION_EVENT = "IMPRESSION";
    /** Abertura/clique na obra; pode ou não ser atribuída a uma impressão. */
    private static final String OPEN_EVENT = "OPEN";

    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final EngagementEventMongoRepository engagementEventRepository;
    private final FinancialLedgerRepository financialLedgerRepository;

    public CreatorAnalyticsApplicationService(
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            EngagementEventMongoRepository engagementEventRepository,
            FinancialLedgerRepository financialLedgerRepository
    ) {
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.engagementEventRepository = engagementEventRepository;
        this.financialLedgerRepository = financialLedgerRepository;
    }

    @Transactional(readOnly = true)
    public CreatorAnalyticsResponseDto getAnalytics(UUID creatorId, int requestedDays) {
        int windowDays = Math.min(MAX_WINDOW_DAYS, Math.max(MIN_WINDOW_DAYS, requestedDays));

        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        LocalDate today = LocalDate.now(DISPLAY_ZONE);
        LocalDate from = today.minusDays(windowDays - 1L);
        Instant windowStart = from.atStartOfDay(DISPLAY_ZONE).toInstant();
        Instant windowEnd = today.plusDays(1).atStartOfDay(DISPLAY_ZONE).toInstant();

        List<WorkEntity> creatorWorks = workRepository.findAllByAuthorId(creatorId);
        List<String> workIds = creatorWorks.stream()
                .map(WorkEntity::getId)
                .filter(Objects::nonNull)
                .map(UUID::toString)
                .toList();

        List<EngagementEventDocument> views = events(workIds, VIEW_EVENT, windowStart, windowEnd);
        List<EngagementEventDocument> pageReads = events(workIds, READ_EVENT, windowStart, windowEnd);
        List<EngagementEventDocument> impressions = events(workIds, IMPRESSION_EVENT, windowStart, windowEnd);
        List<EngagementEventDocument> openings = events(workIds, OPEN_EVENT, windowStart, windowEnd);

        // Impressões anteriores à janela entram só na atribuição de aberturas do início dela.
        List<EngagementEventDocument> attributionImpressions = events(
                workIds, IMPRESSION_EVENT, windowStart.minus(ATTRIBUTION_WINDOW), windowEnd);
        Map<String, Long> attributedByWork = countAttributedOpenings(openings, attributionImpressions);
        long attributedOpenings = attributedByWork.values().stream().mapToLong(Long::longValue).sum();

        List<CreatorAnalyticsResponseDto.DailyViewsDto> viewsPerDay = buildDailySeries(views, from, today);
        List<CreatorAnalyticsResponseDto.PageRetentionDto> retention = buildPageRetention(pageReads);
        CreatorAnalyticsResponseDto.TotalsDto totals = buildTotals(
                views, impressions.size(), openings.size(), attributedOpenings);

        LocalDate previousFrom = from.minusDays(windowDays);
        LocalDate previousTo = from.minusDays(1);
        List<EngagementEventDocument> previousViews = events(
                workIds, VIEW_EVENT,
                previousFrom.atStartOfDay(DISPLAY_ZONE).toInstant(),
                windowStart);
        CreatorAnalyticsResponseDto.ComparisonDto comparison = buildComparison(
                previousViews, previousFrom, previousTo);

        List<CreatorAnalyticsResponseDto.WorkAnalyticsDto> works = buildWorkBreakdown(
                creatorWorks, views, pageReads, impressions, attributedByWork);
        CreatorAnalyticsResponseDto.FunnelDto funnel = buildFunnel(
                impressions.size(), openings.size(), attributedOpenings, views.size(), works);
        CreatorAnalyticsResponseDto.AudienceHeatmapDto heatmap = buildAudienceHeatmap(workIds, today);

        Instant now = Instant.now();
        List<CreatorAnalyticsResponseDto.HourlyViewsDto> realtime = workIds.isEmpty()
                ? List.of()
                : buildHourlySeries(
                        events(workIds, VIEW_EVENT,
                                now.minus(REALTIME_HOURS, ChronoUnit.HOURS), now.plusSeconds(1)),
                        now);

        FinancialTotals financial = sumLedger(creatorId, windowStart);

        return new CreatorAnalyticsResponseDto(
                windowDays,
                from,
                today,
                viewsPerDay,
                retention,
                financial.donations(),
                financial.memberships(),
                financial.withdrawals(),
                financial.donations().add(financial.memberships()),
                creator.getWalletBalanceBrl() == null ? BigDecimal.ZERO : creator.getWalletBalanceBrl(),
                creator.getMonthlyMembersCount() == null ? 0 : creator.getMonthlyMembersCount(),
                totals,
                realtime,
                works,
                comparison,
                funnel,
                heatmap
        );
    }

    private List<EngagementEventDocument> events(
            List<String> workIds,
            String eventType,
            Instant fromInclusive,
            Instant toExclusive
    ) {
        if (workIds.isEmpty()) {
            return List.of();
        }
        return engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(
                workIds, eventType, fromInclusive, toExclusive);
    }

    private CreatorAnalyticsResponseDto.TotalsDto buildTotals(
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

    /**
     * Atribuição declarada: uma abertura conta para o CTR quando existe uma impressão da
     * mesma pessoa para a mesma obra nos 30 minutos anteriores. Aberturas por link
     * externo/direto continuam no funil, mas não inflam o numerador do CTR.
     */
    private Map<String, Long> countAttributedOpenings(
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

    private boolean hasImpressionWithinWindow(List<Instant> sortedTimes, Instant openingAt) {
        int index = Collections.binarySearch(sortedTimes, openingAt);
        if (index < 0) {
            index = -index - 2;
        }
        // binarySearch pode pousar em uma impressão exatamente no instante ou antes dele.
        while (index >= 0 && sortedTimes.get(index).isAfter(openingAt)) {
            index--;
        }
        if (index < 0) {
            return false;
        }
        Instant floor = openingAt.minus(ATTRIBUTION_WINDOW);
        // Também aceita uma impressão exatamente no mesmo instante.
        return !sortedTimes.get(index).isBefore(floor);
    }

    private String attributionKey(EngagementEventDocument event) {
        return event.getWorkId() + "|" + event.getUserId();
    }

    private List<CreatorAnalyticsResponseDto.DailyViewsDto> buildDailySeries(
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

    private CreatorAnalyticsResponseDto.ComparisonDto buildComparison(
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

    /**
     * Série horária das últimas 48h. Horas sem leitura entram com zero para o gráfico
     * em tempo real não "pular" buracos.
     */
    private List<CreatorAnalyticsResponseDto.HourlyViewsDto> buildHourlySeries(
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

    private List<CreatorAnalyticsResponseDto.PageRetentionDto> buildPageRetention(
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

        // Histograma: conta quantos leitores pararam em cada página e soma da última para a primeira.
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

    /**
     * Recorte por obra e capítulo. Obras sem leitura aparecem com zero (o criador vê o
     * catálogo inteiro), e o capítulo mantém o número/título reais do PostgreSQL.
     *
     * <p>Conclusão estimada (versão 1): capítulo de mangá ({@code IMAGE_PAGES}) concluído
     * quando o leitor alcança ≥80% das páginas distintas. Prosa fica {@code null} até
     * existir checkpoint de progresso de prosa — não inferimos conclusão por página.</p>
     */
    private List<CreatorAnalyticsResponseDto.WorkAnalyticsDto> buildWorkBreakdown(
            List<WorkEntity> creatorWorks,
            List<EngagementEventDocument> views,
            List<EngagementEventDocument> pageReads,
            List<EngagementEventDocument> impressions,
            Map<String, Long> attributedByWork
    ) {
        Map<String, List<EngagementEventDocument>> viewsByWork = views.stream()
                .filter(e -> e.getWorkId() != null)
                .collect(Collectors.groupingBy(EngagementEventDocument::getWorkId));
        Map<String, Long> impressionsByWork = impressions.stream()
                .filter(e -> e.getWorkId() != null)
                .collect(Collectors.groupingBy(EngagementEventDocument::getWorkId, Collectors.counting()));
        Map<String, List<EngagementEventDocument>> readsByChapter = pageReads.stream()
                .filter(e -> e.getChapterId() != null && e.getUserId() != null)
                .collect(Collectors.groupingBy(EngagementEventDocument::getChapterId));

        List<CreatorAnalyticsResponseDto.WorkAnalyticsDto> works = new ArrayList<>();
        for (WorkEntity work : creatorWorks) {
            if (work.getId() == null) {
                continue;
            }
            String workId = work.getId().toString();
            List<EngagementEventDocument> workViews = viewsByWork.getOrDefault(workId, List.of());
            long uniqueReaders = workViews.stream()
                    .map(EngagementEventDocument::getUserId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();
            long workImpressions = impressionsByWork.getOrDefault(workId, 0L);
            long workAttributed = attributedByWork.getOrDefault(workId, 0L);

            List<CreatorAnalyticsResponseDto.ChapterAnalyticsDto> chapters =
                    buildChapterBreakdown(work.getId(), workViews, readsByChapter);

            long eligibleStarts = 0;
            long completedReaders = 0;
            for (CreatorAnalyticsResponseDto.ChapterAnalyticsDto chapter : chapters) {
                if (chapter.completionRatePercent() != null) {
                    eligibleStarts += chapter.views();
                    completedReaders += chapter.completedReaders();
                }
            }

            works.add(new CreatorAnalyticsResponseDto.WorkAnalyticsDto(
                    workId,
                    work.getTitle(),
                    work.getSlug(),
                    work.getCoverUrl(),
                    work.getStatus() != null ? work.getStatus().name() : null,
                    workViews.size(),
                    uniqueReaders,
                    chapters,
                    workImpressions,
                    workAttributed,
                    percent(workAttributed, workImpressions),
                    percent(completedReaders, eligibleStarts),
                    completedReaders
            ));
        }

        works.sort(Comparator
                .comparingLong(CreatorAnalyticsResponseDto.WorkAnalyticsDto::views).reversed()
                .thenComparing(CreatorAnalyticsResponseDto.WorkAnalyticsDto::title,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)));
        return works;
    }

    private List<CreatorAnalyticsResponseDto.ChapterAnalyticsDto> buildChapterBreakdown(
            UUID workId,
            List<EngagementEventDocument> workViews,
            Map<String, List<EngagementEventDocument>> readsByChapter
    ) {
        Map<String, List<EngagementEventDocument>> byChapter = workViews.stream()
                .filter(e -> e.getChapterId() != null)
                .collect(Collectors.groupingBy(EngagementEventDocument::getChapterId));

        List<ChapterEntity> chapters = new ArrayList<>(
                chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(workId));
        chapters.sort(Comparator.comparing(ChapterEntity::getChapterNumber,
                Comparator.nullsLast(Comparator.naturalOrder())));

        List<CreatorAnalyticsResponseDto.ChapterAnalyticsDto> breakdown = new ArrayList<>(chapters.size());
        for (ChapterEntity chapter : chapters) {
            String chapterId = chapter.getId().toString();
            List<EngagementEventDocument> chapterEvents = byChapter.getOrDefault(chapterId, List.of());
            Set<String> viewerIds = chapterEvents.stream()
                    .map(EngagementEventDocument::getUserId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            long uniqueReaders = viewerIds.size();

            int pages = mangaPageCount(chapter);
            long completed = pages <= 0
                    ? 0
                    : completedReaders(readsByChapter.getOrDefault(chapterId, List.of()), pages, viewerIds);
            Double completionRate = pages <= 0 ? null : percent(completed, uniqueReaders);

            breakdown.add(new CreatorAnalyticsResponseDto.ChapterAnalyticsDto(
                    chapterId,
                    chapter.getChapterNumber() == null ? 0 : chapter.getChapterNumber(),
                    chapter.getTitle(),
                    chapterEvents.size(),
                    uniqueReaders,
                    completionRate,
                    completed
            ));
        }
        return breakdown;
    }

    /** Maior página alcançada por leitor; conclusão = ≥80% das páginas distintas. */
    private long completedReaders(
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
            // Só conta quem tem início qualificado (VIEW) no capítulo. READ órfão de
            // telemetria antiga não pode inflar a conclusão acima de 100%.
            if (read.getUserId() == null
                    || read.getReadPage() == null
                    || !viewerIds.contains(read.getUserId())) {
                continue;
            }
            maxPageByReader.merge(read.getUserId(), read.getReadPage(), Math::max);
        }
        return maxPageByReader.values().stream().filter(page -> page >= threshold).count();
    }

    /**
     * Número de páginas de um capítulo de mangá. Prosa não tem "páginas" e devolve 0,
     * mantendo a conclusão indisponível em vez de inventar uma taxa.
     */
    private int mangaPageCount(ChapterEntity chapter) {
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

    private CreatorAnalyticsResponseDto.FunnelDto buildFunnel(
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

    /** Matriz dia × hora das visualizações dos últimos 28 dias, no fuso de exibição. */
    private CreatorAnalyticsResponseDto.AudienceHeatmapDto buildAudienceHeatmap(
            List<String> workIds,
            LocalDate today
    ) {
        Instant start = today.minusDays(HEATMAP_DAYS - 1L).atStartOfDay(DISPLAY_ZONE).toInstant();
        Instant end = today.plusDays(1).atStartOfDay(DISPLAY_ZONE).toInstant();
        List<EngagementEventDocument> recentViews = events(workIds, VIEW_EVENT, start, end);

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

    private FinancialTotals sumLedger(UUID creatorId, Instant windowStart) {
        // O ledger grava createdAt com @CreationTimestamp (relógio local da JVM).
        // A borda precisa usar o mesmo fuso para não deslocar a janela em horas.
        LocalDateTime start = LocalDateTime.ofInstant(windowStart, ZoneId.systemDefault());
        BigDecimal donations = BigDecimal.ZERO;
        BigDecimal memberships = BigDecimal.ZERO;
        BigDecimal withdrawals = BigDecimal.ZERO;

        List<FinancialLedgerEntity> entries = financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(creatorId, start);

        for (FinancialLedgerEntity entry : entries) {
            BigDecimal net = entry.getCreatorNetBrl() == null ? BigDecimal.ZERO : entry.getCreatorNetBrl();
            if (entry.getTransactionType() == null) {
                continue;
            }
            switch (entry.getTransactionType()) {
                case DOACAO -> donations = donations.add(net);
                case ASSINATURA_MEMBRO -> memberships = memberships.add(net);
                case SAQUE_PIX_CRIADOR -> withdrawals = withdrawals.add(net);
                default -> {
                    // ASSINATURA_VIP_PLATAFORMA não pertence ao criador.
                }
            }
        }
        return new FinancialTotals(donations, memberships, withdrawals);
    }

    /** Percentual com 1 casa; {@code null} quando o denominador é zero (sem dados). */
    private static Double percent(long numerator, long denominator) {
        if (denominator <= 0) {
            return null;
        }
        return BigDecimal.valueOf(numerator * 100.0 / denominator)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private record FinancialTotals(BigDecimal donations, BigDecimal memberships, BigDecimal withdrawals) {}
}
