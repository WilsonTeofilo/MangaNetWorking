package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Analytics editorial do criador.
 *
 * <p>Orquestra o acesso a dados de engajamento ({@code engagement_events}), obras/capítulos (JPA)
 * e transações financeiras ({@code financial_ledger}), delegando as computações matemáticas
 * e agregações de séries temporais a {@link CreatorAnalyticsSeriesAggregator}.</p>
 */
@Service
public class CreatorAnalyticsApplicationService {

    private static final int MIN_WINDOW_DAYS = 1;
    private static final int MAX_WINDOW_DAYS = 180;

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
    private final CreatorAnalyticsSeriesAggregator seriesAggregator;

    public CreatorAnalyticsApplicationService(
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            EngagementEventMongoRepository engagementEventRepository,
            FinancialLedgerRepository financialLedgerRepository
    ) {
        this(creatorRepository, workRepository, chapterRepository, engagementEventRepository,
                financialLedgerRepository, new CreatorAnalyticsSeriesAggregator());
    }

    @Autowired
    public CreatorAnalyticsApplicationService(
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            EngagementEventMongoRepository engagementEventRepository,
            FinancialLedgerRepository financialLedgerRepository,
            CreatorAnalyticsSeriesAggregator seriesAggregator
    ) {
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.engagementEventRepository = engagementEventRepository;
        this.financialLedgerRepository = financialLedgerRepository;
        this.seriesAggregator = seriesAggregator != null ? seriesAggregator : new CreatorAnalyticsSeriesAggregator();
    }

    @Transactional(readOnly = true)
    public CreatorAnalyticsResponseDto getAnalytics(UUID creatorId, int requestedDays) {
        int windowDays = Math.min(MAX_WINDOW_DAYS, Math.max(MIN_WINDOW_DAYS, requestedDays));

        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        LocalDate today = LocalDate.now(CreatorAnalyticsSeriesAggregator.DISPLAY_ZONE);
        LocalDate from = today.minusDays(windowDays - 1L);
        Instant windowStart = from.atStartOfDay(CreatorAnalyticsSeriesAggregator.DISPLAY_ZONE).toInstant();
        Instant windowEnd = today.plusDays(1).atStartOfDay(CreatorAnalyticsSeriesAggregator.DISPLAY_ZONE).toInstant();

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
                workIds, IMPRESSION_EVENT,
                windowStart.minus(CreatorAnalyticsSeriesAggregator.ATTRIBUTION_WINDOW), windowEnd);
        Map<String, Long> attributedByWork = seriesAggregator.countAttributedOpenings(openings, attributionImpressions);
        long attributedOpenings = attributedByWork.values().stream().mapToLong(Long::longValue).sum();

        List<CreatorAnalyticsResponseDto.DailyViewsDto> viewsPerDay = seriesAggregator.buildDailySeries(views, from, today);
        List<CreatorAnalyticsResponseDto.PageRetentionDto> retention = seriesAggregator.buildPageRetention(pageReads);
        CreatorAnalyticsResponseDto.TotalsDto totals = seriesAggregator.calculateTotals(
                views, impressions.size(), openings.size(), attributedOpenings);

        LocalDate previousFrom = from.minusDays(windowDays);
        LocalDate previousTo = from.minusDays(1);
        List<EngagementEventDocument> previousViews = events(
                workIds, VIEW_EVENT,
                previousFrom.atStartOfDay(CreatorAnalyticsSeriesAggregator.DISPLAY_ZONE).toInstant(),
                windowStart);
        CreatorAnalyticsResponseDto.ComparisonDto comparison = seriesAggregator.buildComparison(
                previousViews, previousFrom, previousTo);

        List<CreatorAnalyticsResponseDto.WorkAnalyticsDto> works = buildWorkBreakdown(
                creatorWorks, views, pageReads, impressions, attributedByWork);
        CreatorAnalyticsResponseDto.FunnelDto funnel = seriesAggregator.buildFunnel(
                impressions.size(), openings.size(), attributedOpenings, views.size(), works);

        Instant heatmapStart = today.minusDays(CreatorAnalyticsSeriesAggregator.HEATMAP_DAYS - 1L)
                .atStartOfDay(CreatorAnalyticsSeriesAggregator.DISPLAY_ZONE).toInstant();
        Instant heatmapEnd = today.plusDays(1)
                .atStartOfDay(CreatorAnalyticsSeriesAggregator.DISPLAY_ZONE).toInstant();
        List<EngagementEventDocument> heatmapViews = events(workIds, VIEW_EVENT, heatmapStart, heatmapEnd);
        CreatorAnalyticsResponseDto.AudienceHeatmapDto heatmap = seriesAggregator.buildAudienceHeatmap(heatmapViews);

        Instant now = Instant.now();
        List<CreatorAnalyticsResponseDto.HourlyViewsDto> realtime = workIds.isEmpty()
                ? List.of()
                : seriesAggregator.buildHourlySeries(
                        events(workIds, VIEW_EVENT,
                                now.minus(CreatorAnalyticsSeriesAggregator.REALTIME_HOURS, ChronoUnit.HOURS),
                                now.plusSeconds(1)),
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
                    seriesAggregator.percent(workAttributed, workImpressions),
                    seriesAggregator.percent(completedReaders, eligibleStarts),
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

            int pages = seriesAggregator.mangaPageCount(chapter);
            long completed = pages <= 0
                    ? 0
                    : seriesAggregator.completedReaders(readsByChapter.getOrDefault(chapterId, List.of()), pages, viewerIds);
            Double completionRate = pages <= 0 ? null : seriesAggregator.percent(completed, uniqueReaders);

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

    private FinancialTotals sumLedger(UUID creatorId, Instant windowStart) {
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
                    // Ignora transações não direcionadas ao criador
                }
            }
        }
        return new FinancialTotals(donations, memberships, withdrawals);
    }

    private record FinancialTotals(BigDecimal donations, BigDecimal memberships, BigDecimal withdrawals) {}
}
