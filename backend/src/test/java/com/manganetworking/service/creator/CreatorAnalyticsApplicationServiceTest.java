package com.manganetworking.service.creator;

import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.FinancialLedgerEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.creator.dto.CreatorAnalyticsResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CreatorAnalyticsApplicationServiceTest {

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private EngagementEventMongoRepository engagementEventRepository;

    @Mock
    private FinancialLedgerRepository financialLedgerRepository;

    @InjectMocks
    private CreatorAnalyticsApplicationService analyticsService;

    private UUID creatorId;
    private CreatorEntity creator;
    private WorkEntity work;

    @BeforeEach
    void setUp() {
        creatorId = UUID.randomUUID();
        creator = new CreatorEntity();
        creator.setId(creatorId);
        creator.setWalletBalanceBrl(new BigDecimal("100.00"));
        creator.setMonthlyMembersCount(3);

        work = new WorkEntity();
        work.setId(UUID.randomUUID());
    }

    private EngagementEventDocument read(String userId, int page) {
        EngagementEventDocument event = new EngagementEventDocument();
        event.setEventType("READ");
        event.setUserId(userId);
        event.setWorkId(work.getId().toString());
        event.setReadPage(page);
        event.setTimestamp(Instant.now());
        return event;
    }

    private EngagementEventDocument view(String userId, ChapterEntity chapter) {
        EngagementEventDocument event = new EngagementEventDocument();
        event.setEventType("VIEW");
        event.setUserId(userId);
        event.setWorkId(work.getId().toString());
        event.setChapterId(chapter.getId().toString());
        event.setReadPage(1);
        event.setTimestamp(Instant.now());
        return event;
    }

    private FinancialLedgerEntity ledger(TransactionType type, String net) {
        FinancialLedgerEntity entry = new FinancialLedgerEntity();
        entry.setTransactionType(type);
        entry.setCreatorNetBrl(new BigDecimal(net));
        return entry;
    }

    @Test
    @DisplayName("visualização é por capítulo lido, retenção vem das páginas lidas e os lançamentos são somados por tipo")
    void shouldComputeRetentionAndFinancialTotals() {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setChapterNumber(1);
        chapter.setTitle("Capítulo 1");
        chapter.setWork(work);

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId()))
                .thenReturn(List.of(chapter));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("VIEW"), any(), any()))
                .thenReturn(List.of(
                        view("leitor-a", chapter),
                        view("leitor-b", chapter),
                        view("leitor-b", chapter)
                ));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("READ"), any(), any()))
                .thenReturn(List.of(
                        read("leitor-a", 1),
                        read("leitor-a", 2),
                        read("leitor-a", 3),
                        read("leitor-b", 1)
                ));
        when(engagementEventRepository
                .findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("IMPRESSION"), any(), any()))
                .thenReturn(List.of());
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("OPEN"), any(), any()))
                .thenReturn(List.of());
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of(
                        ledger(TransactionType.DOACAO, "10.00"),
                        ledger(TransactionType.ASSINATURA_MEMBRO, "20.00"),
                        ledger(TransactionType.SAQUE_PIX_CRIADOR, "5.00"),
                        ledger(TransactionType.ASSINATURA_VIP_PLATAFORMA, "99.00")
                ));

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, 30);

        assertThat(response.windowDays()).isEqualTo(30);
        assertThat(response.viewsPerDay()).hasSize(30);
        assertThat(response.viewsPerDay().stream()
                .mapToLong(CreatorAnalyticsResponseDto.DailyViewsDto::views).sum())
                .isEqualTo(3);
        assertThat(response.viewsPerDay().stream()
                .mapToLong(CreatorAnalyticsResponseDto.DailyViewsDto::uniqueReaders).max().orElse(0))
                .isEqualTo(2);

        assertThat(response.pageRetention()).extracting(CreatorAnalyticsResponseDto.PageRetentionDto::page)
                .containsExactly(1, 2, 3);
        assertThat(response.pageRetention()).extracting(CreatorAnalyticsResponseDto.PageRetentionDto::readers)
                .containsExactly(2L, 1L, 1L);
        assertThat(response.pageRetention().get(0).retentionPercent()).isEqualTo(100.0);
        assertThat(response.pageRetention().get(1).retentionPercent()).isEqualTo(50.0);

        assertThat(response.netDonationsBrl()).isEqualByComparingTo("10.00");
        assertThat(response.netMembershipsBrl()).isEqualByComparingTo("20.00");
        assertThat(response.netWithdrawalsBrl()).isEqualByComparingTo("5.00");
        assertThat(response.netEarningsBrl()).isEqualByComparingTo("30.00");
        assertThat(response.walletBalanceBrl()).isEqualByComparingTo("100.00");
        assertThat(response.monthlyMembersCount()).isEqualTo(3);

        // Visão geral: 3 visualizações (uma por leitor por capítulo) e 2 leitores únicos.
        assertThat(response.totals().views()).isEqualTo(3);
        assertThat(response.totals().uniqueReaders()).isEqualTo(2);

        // Subdivisão por obra: o conteúdo principal aparece com o total da janela.
        assertThat(response.works()).hasSize(1);
        assertThat(response.works().get(0).views()).isEqualTo(3);
        assertThat(response.works().get(0).uniqueReaders()).isEqualTo(2);
        assertThat(response.works().get(0).workId()).isEqualTo(work.getId().toString());
        assertThat(response.works().get(0).chapters().get(0).views()).isEqualTo(3);
    }

    @Test
    @DisplayName("criador sem obras não consulta eventos e devolve série zerada")
    void shouldReturnZeroedSeriesWhenCreatorHasNoWork() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of());
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, 7);

        assertThat(response.viewsPerDay()).hasSize(7);
        assertThat(response.viewsPerDay()).allSatisfy(day -> {
            assertThat(day.views()).isZero();
            assertThat(day.uniqueReaders()).isZero();
        });
        assertThat(response.pageRetention()).isEmpty();
        assertThat(response.netEarningsBrl()).isEqualByComparingTo(BigDecimal.ZERO);
        verify(engagementEventRepository, never())
                .findByWorkIdInAndEventTypeAndTimestampBetween(any(), any(), any(), any());
    }

    @Test
    @DisplayName("windowDays fora da faixa é fixado entre 1 e 180")
    void shouldClampWindowDays() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of());
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        assertThat(analyticsService.getAnalytics(creatorId, 0).windowDays()).isEqualTo(1);
        assertThat(analyticsService.getAnalytics(creatorId, 5_000).windowDays()).isEqualTo(180);
        assertThat(analyticsService.getAnalytics(creatorId, 90).to())
                .isEqualTo(LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo")));
    }

    private EngagementEventDocument readForChapter(String userId, ChapterEntity chapter, int page) {
        EngagementEventDocument event = read(userId, page);
        event.setChapterId(chapter.getId().toString());
        return event;
    }

    private EngagementEventDocument impression(String userId, Instant at) {
        EngagementEventDocument event = new EngagementEventDocument();
        event.setEventType("IMPRESSION");
        event.setUserId(userId);
        event.setWorkId(work.getId().toString());
        event.setSurface("FEED");
        event.setTimestamp(at);
        return event;
    }

    private EngagementEventDocument opening(String userId, Instant at) {
        EngagementEventDocument event = new EngagementEventDocument();
        event.setEventType("OPEN");
        event.setUserId(userId);
        event.setWorkId(work.getId().toString());
        event.setSurface("FEED");
        event.setTimestamp(at);
        return event;
    }

    private ChapterEntity mangaChapter(int pages) {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setChapterNumber(1);
        chapter.setTitle("Capítulo 1");
        chapter.setWork(work);
        StringBuilder json = new StringBuilder("[");
        for (int page = 1; page <= pages; page++) {
            if (page > 1) {
                json.append(',');
            }
            json.append('"').append("pagina-").append(page).append('"');
        }
        chapter.setPagesJson(json.append(']').toString());
        return chapter;
    }

    @Test
    @DisplayName("CTR usa só aberturas atribuídas a impressão recente e conclusão de mangá usa 80% das páginas")
    void shouldComputeAttributedCtrAndMangaCompletion() {
        ChapterEntity chapter = mangaChapter(10);
        Instant base = Instant.now().minus(10, java.time.temporal.ChronoUnit.MINUTES);

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId()))
                .thenReturn(List.of(chapter));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("VIEW"), any(), any()))
                .thenReturn(List.of(
                        view("leitor-a", chapter),
                        view("leitor-b", chapter)
                ));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("READ"), any(), any()))
                .thenReturn(List.of(
                        readForChapter("leitor-a", chapter, 8),
                        readForChapter("leitor-b", chapter, 2),
                        // READ sem VIEW (telemetria antiga) não pode inflar a conclusão.
                        readForChapter("leitor-fora", chapter, 10)
                ));
        when(engagementEventRepository
                .findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("IMPRESSION"), any(), any()))
                .thenReturn(List.of(impression("leitor-a", base.minusSeconds(60)),
                        impression("leitor-a", base.minusSeconds(30))));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("OPEN"), any(), any()))
                .thenReturn(List.of(opening("leitor-a", base)));
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, 7);

        assertThat(response.totals().impressions()).isEqualTo(2);
        assertThat(response.totals().openings()).isEqualTo(1);
        assertThat(response.totals().attributedOpenings()).isEqualTo(1);
        assertThat(response.totals().ctrPercent()).isEqualTo(50.0);
        assertThat(response.works().get(0).impressions()).isEqualTo(2);
        assertThat(response.works().get(0).attributedOpenings()).isEqualTo(1);
        assertThat(response.works().get(0).ctrPercent()).isEqualTo(50.0);

        // 8 de 10 páginas = 80%: leitor-a concluiu, leitor-b não.
        assertThat(response.works().get(0).chapters().get(0).completedReaders()).isEqualTo(1);
        assertThat(response.works().get(0).chapters().get(0).completionRatePercent()).isEqualTo(50.0);
        assertThat(response.works().get(0).completionRatePercent()).isEqualTo(50.0);
        assertThat(response.funnel().qualifiedStarts()).isEqualTo(2);
        assertThat(response.funnel().completions()).isEqualTo(1L);
    }

    @Test
    @DisplayName("abertura sem impressão não entra no numerador do CTR (CTR real 0, nunca inventado)")
    void shouldNotAttributeOpeningWithoutImpression() {
        ChapterEntity chapter = mangaChapter(5);
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId()))
                .thenReturn(List.of(chapter));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("VIEW"), any(), any()))
                .thenReturn(List.of(view("leitor-a", chapter)));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("READ"), any(), any()))
                .thenReturn(List.of());
        when(engagementEventRepository
                .findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("IMPRESSION"), any(), any()))
                .thenReturn(List.of(impression("leitor-a", Instant.now().minusSeconds(3600))));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("OPEN"), any(), any()))
                .thenReturn(List.of(opening("leitor-a", Instant.now())));
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, 7);

        // Impressão de 1h atrás está fora da janela de atribuição de 30 min.
        assertThat(response.totals().attributedOpenings()).isZero();
        assertThat(response.totals().ctrPercent()).isZero();
    }

    @Test
    @DisplayName("prosa não inventa conclusão: taxa fica indisponível até existir checkpoint de progresso")
    void shouldKeepProseCompletionUnavailable() {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setChapterNumber(1);
        chapter.setTitle("Prólogo");
        chapter.setWork(work);
        chapter.setFormat(com.manganetworking.domain.enums.ChapterFormat.PROSE);
        chapter.setContentText("texto");

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId()))
                .thenReturn(List.of(chapter));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("VIEW"), any(), any()))
                .thenReturn(List.of(view("leitor-a", chapter)));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("READ"), any(), any()))
                .thenReturn(List.of());
        when(engagementEventRepository
                .findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("IMPRESSION"), any(), any()))
                .thenReturn(List.of());
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("OPEN"), any(), any()))
                .thenReturn(List.of());
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, 7);

        assertThat(response.works().get(0).chapters().get(0).completionRatePercent()).isNull();
        assertThat(response.works().get(0).completionRatePercent()).isNull();
        assertThat(response.funnel().completions()).isNull();
    }

    @Test
    @DisplayName("comparação usa a janela anterior de mesma duração e heatmap converte para America/Sao_Paulo")
    void shouldComparePreviousWindowAndConvertHeatmapTimezone() {
        ChapterEntity chapter = mangaChapter(3);
        java.time.ZoneId displayZone = java.time.ZoneId.of("America/Sao_Paulo");
        LocalDate today = LocalDate.now(displayZone);
        int windowDays = 7;
        LocalDate from = today.minusDays(windowDays - 1L);
        Instant previousStart = from.minusDays(windowDays).atStartOfDay(displayZone).toInstant();
        Instant previousDay = from.minusDays(windowDays).plusDays(1)
                .atTime(12, 30).atZone(displayZone).toInstant();
        Instant currentDay = today.atTime(12, 30).atZone(displayZone).toInstant();

        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId()))
                .thenReturn(List.of(chapter));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("VIEW"), any(), any()))
                .thenAnswer(invocation -> {
                    Instant fromArg = invocation.getArgument(2);
                    if (previousStart.equals(fromArg)) {
                        EngagementEventDocument first = view("leitor-a", chapter);
                        first.setTimestamp(previousDay);
                        EngagementEventDocument second = view("leitor-b", chapter);
                        second.setTimestamp(previousDay);
                        return List.of(first, second);
                    }
                    EngagementEventDocument current = view("leitor-c", chapter);
                    current.setTimestamp(currentDay);
                    return List.of(current);
                });
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("READ"), any(), any()))
                .thenReturn(List.of());
        when(engagementEventRepository
                .findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("IMPRESSION"), any(), any()))
                .thenReturn(List.of());
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("OPEN"), any(), any()))
                .thenReturn(List.of());
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, windowDays);

        assertThat(response.comparison().views()).isEqualTo(2);
        assertThat(response.comparison().uniqueReaders()).isEqualTo(2);
        assertThat(response.comparison().viewsPerDay()).hasSize(windowDays);
        assertThat(response.comparison().viewsPerDay().stream()
                .mapToLong(CreatorAnalyticsResponseDto.DailyComparisonDto::views).sum()).isEqualTo(2);
        assertThat(response.totals().views()).isEqualTo(1);

        assertThat(response.audienceHeatmap().timezone()).isEqualTo("America/Sao_Paulo");
        assertThat(response.audienceHeatmap().days()).isEqualTo(28);
        assertThat(response.audienceHeatmap().sampleSize()).isEqualTo(1);
        var local = currentDay.atZone(java.time.ZoneId.of("America/Sao_Paulo"));
        assertThat(response.audienceHeatmap().cells())
                .filteredOn(cell -> cell.weekday() == local.getDayOfWeek().getValue()
                        && cell.hour() == local.getHour())
                .extracting(CreatorAnalyticsResponseDto.HeatmapCellDto::views)
                .containsExactly(1L);
    }

    @Test
    @DisplayName("sem impressões/aberturas o contrato devolve indisponível, não zero fabricado")
    void shouldReturnUnavailableWhenDiscoveryWasNeverInstrumented() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(financialLedgerRepository
                .findAllByCreatorIdAndCreatedAtGreaterThanEqualOrderByCreatedAtDesc(eq(creatorId), any()))
                .thenReturn(List.of());

        CreatorAnalyticsResponseDto response = analyticsService.getAnalytics(creatorId, 7);

        assertThat(response.totals().impressions()).isZero();
        assertThat(response.totals().openings()).isZero();
        assertThat(response.totals().ctrPercent()).isNull();
        assertThat(response.funnel().completions()).isNull();
        assertThat(response.audienceHeatmap().sampleSize()).isZero();
        assertThat(response.comparison().views()).isZero();
    }
}
