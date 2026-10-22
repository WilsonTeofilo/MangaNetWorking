package com.manganetworking.service.creator;

import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.nosql.EngagementEventDocument;
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
import java.time.ZoneOffset;
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

    private FinancialLedgerEntity ledger(TransactionType type, String net) {
        FinancialLedgerEntity entry = new FinancialLedgerEntity();
        entry.setTransactionType(type);
        entry.setCreatorNetBrl(new BigDecimal(net));
        return entry;
    }

    @Test
    @DisplayName("retenção por página é cumulativa e os lançamentos são somados por tipo")
    void shouldComputeRetentionAndFinancialTotals() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
        when(workRepository.findAllByAuthorId(creatorId)).thenReturn(List.of(work));
        when(engagementEventRepository.findByWorkIdInAndEventTypeAndTimestampBetween(any(), eq("READ"), any(), any()))
                .thenReturn(List.of(
                        read("leitor-a", 1),
                        read("leitor-a", 2),
                        read("leitor-a", 3),
                        read("leitor-b", 1)
                ));
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
        assertThat(response.readsPerDay()).hasSize(30);
        assertThat(response.readsPerDay().stream().mapToLong(CreatorAnalyticsResponseDto.DailyReadsDto::reads).sum())
                .isEqualTo(4);
        assertThat(response.readsPerDay().stream()
                .mapToLong(CreatorAnalyticsResponseDto.DailyReadsDto::uniqueReaders).max().orElse(0))
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

        // Visão geral: 4 page reads e 2 leitores únicos distintos na janela (não a soma dos dias).
        assertThat(response.totals().reads()).isEqualTo(4);
        assertThat(response.totals().uniqueReaders()).isEqualTo(2);

        // Subdivisão por obra: o conteúdo principal aparece com o total da janela.
        assertThat(response.works()).hasSize(1);
        assertThat(response.works().get(0).reads()).isEqualTo(4);
        assertThat(response.works().get(0).uniqueReaders()).isEqualTo(2);
        assertThat(response.works().get(0).workId()).isEqualTo(work.getId().toString());
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

        assertThat(response.readsPerDay()).hasSize(7);
        assertThat(response.readsPerDay()).allSatisfy(day -> {
            assertThat(day.reads()).isZero();
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
        assertThat(analyticsService.getAnalytics(creatorId, 90).to()).isEqualTo(LocalDate.now(ZoneOffset.UTC));
    }
}
