package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.FinancialLedgerEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Analytics editorial do criador.
 *
 * <p>Não fabrica dado: lê eventos reais de leitura ({@code engagement_events}) e o
 * {@code financial_ledger}. Se não houver evento no período, devolve série zerada.</p>
 *
 * <p><b>Limite conhecido:</b> o evento é gravado por página lida ({@code trackPageRead});
 * a série diária conta page reads, não sessões — o campo {@code uniqueReaders} diferencia.</p>
 */
@Service
public class CreatorAnalyticsApplicationService {

    private static final int MIN_WINDOW_DAYS = 1;
    private static final int MAX_WINDOW_DAYS = 90;
    private static final int MAX_RETENTION_PAGES = 200;
    private static final String READ_EVENT = "READ";

    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final EngagementEventMongoRepository engagementEventRepository;
    private final FinancialLedgerRepository financialLedgerRepository;

    public CreatorAnalyticsApplicationService(
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            EngagementEventMongoRepository engagementEventRepository,
            FinancialLedgerRepository financialLedgerRepository
    ) {
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.engagementEventRepository = engagementEventRepository;
        this.financialLedgerRepository = financialLedgerRepository;
    }

    @Transactional(readOnly = true)
    public CreatorAnalyticsResponseDto getAnalytics(UUID creatorId, int requestedDays) {
        int windowDays = Math.min(MAX_WINDOW_DAYS, Math.max(MIN_WINDOW_DAYS, requestedDays));

        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate from = today.minusDays(windowDays - 1L);
        Instant windowStart = from.atStartOfDay(ZoneOffset.UTC).toInstant();

        List<String> workIds = workRepository.findAllByAuthorId(creatorId).stream()
                .map(WorkEntity::getId)
                .filter(Objects::nonNull)
                .map(UUID::toString)
                .toList();

        List<EngagementEventDocument> events = workIds.isEmpty()
                ? List.of()
                : engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampAfter(
                        workIds, READ_EVENT, windowStart);

        List<CreatorAnalyticsResponseDto.DailyReadsDto> readsPerDay = buildDailySeries(events, from, today);
        List<CreatorAnalyticsResponseDto.PageRetentionDto> retention = buildPageRetention(events);

        FinancialTotals totals = sumLedger(creatorId, windowStart);

        return new CreatorAnalyticsResponseDto(
                windowDays,
                from,
                today,
                readsPerDay,
                retention,
                totals.donations(),
                totals.memberships(),
                totals.withdrawals(),
                totals.donations().add(totals.memberships()),
                creator.getWalletBalanceBrl() == null ? BigDecimal.ZERO : creator.getWalletBalanceBrl(),
                creator.getMonthlyMembersCount() == null ? 0 : creator.getMonthlyMembersCount()
        );
    }

    private List<CreatorAnalyticsResponseDto.DailyReadsDto> buildDailySeries(
            List<EngagementEventDocument> events,
            LocalDate from,
            LocalDate to
    ) {
        Map<LocalDate, List<EngagementEventDocument>> byDay = events.stream()
                .filter(e -> e.getTimestamp() != null)
                .collect(Collectors.groupingBy(e ->
                        e.getTimestamp().atZone(ZoneOffset.UTC).toLocalDate()));

        List<CreatorAnalyticsResponseDto.DailyReadsDto> series = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            List<EngagementEventDocument> dayEvents = byDay.getOrDefault(day, List.of());
            long uniqueReaders = dayEvents.stream()
                    .map(EngagementEventDocument::getUserId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();
            series.add(new CreatorAnalyticsResponseDto.DailyReadsDto(day, dayEvents.size(), uniqueReaders));
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
        // O(dias + páginas) em vez de O(páginas × leitores).
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
            double percent = (readers * 100.0) / totalReaders;
            retention.add(new CreatorAnalyticsResponseDto.PageRetentionDto(
                    page,
                    readers,
                    BigDecimal.valueOf(percent).setScale(1, RoundingMode.HALF_UP).doubleValue()
            ));
        }
        return retention;
    }

    private FinancialTotals sumLedger(UUID creatorId, Instant windowStart) {
        // O ledger grava createdAt com @CreationTimestamp (relógio local do JVM).
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

    private record FinancialTotals(BigDecimal donations, BigDecimal memberships, BigDecimal withdrawals) {}
}
