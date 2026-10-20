package com.manganetworking.service.monetization;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.enums.PaymentStatus;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.relational.*;
import com.manganetworking.repository.jpa.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MonetizationServiceTest {

    @Mock
    private DonationRepository donationRepository;

    @Mock
    private MembershipSubscriptionRepository membershipRepository;

    @Mock
    private FinancialLedgerRepository ledgerRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ChapterRepository chapterRepository;

    private MonetizationService monetizationService;

    private CreatorEntity creator;
    private UserEntity user;
    private UUID creatorId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        creatorId = UUID.randomUUID();
        userId = UUID.randomUUID();

        creator = new CreatorEntity();
        creator.setId(creatorId);
        creator.setHandle("mangaka_original");
        creator.setDocumentCpf("111.222.333-44");
        creator.setPixKey("autor@manganetworking.com");
        creator.setPixKeyType(PixKeyType.EMAIL);
        creator.setWalletBalanceBrl(BigDecimal.ZERO);
        creator.setMembershipPriceBrl(new BigDecimal("23.00"));
        creator.setTotalDonationsBrl(BigDecimal.ZERO);
        creator.setMonthlyMembersCount(0);

        user = new UserEntity();
        user.setId(userId);
        user.setName("Leitor Apoiador");
        user.setEmail("leitor@gmail.com");

        // Propriedades reais (0.17 de taxa etc.) injetadas explicitamente; antes o serviço
        // dependia de fallback para constantes hardcoded quando as propriedades vinham nulas.
        monetizationService = new MonetizationService(
                donationRepository, membershipRepository, ledgerRepository,
                creatorRepository, userRepository, workRepository, chapterRepository,
                new PlatformProperties()
        );
    }

    @Test
    @DisplayName("Deve processar doação com split exato: 83% para o criador e 17% taxa da plataforma")
    void shouldProcessDonationWithExactSplit() {
        when(ledgerRepository.findByPaymentExternalId("PAY_123")).thenReturn(Optional.empty());
        when(creatorRepository.findByIdForUpdate(creatorId)).thenReturn(Optional.of(creator));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(donationRepository.save(any(DonationEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(ledgerRepository.save(any(FinancialLedgerEntity.class))).thenAnswer(i -> i.getArgument(0));

        BigDecimal donationAmount = new BigDecimal("100.00");
        DonationEntity result = monetizationService.processDonation(
                userId, creatorId, null, null, donationAmount, "Parabéns pela obra!", "PAY_123"
        );

        assertNotNull(result);
        assertEquals(new BigDecimal("100.00"), result.getGrossAmountBrl());
        assertEquals(new BigDecimal("17.00"), result.getPlatformFeeBrl());
        assertEquals(new BigDecimal("83.00"), result.getCreatorNetBrl());
        assertEquals(PaymentStatus.APROVADO, result.getStatus());

        // Carteira do criador recebe exatamente os 83% líquidos
        assertEquals(new BigDecimal("83.00"), creator.getWalletBalanceBrl());
        assertEquals(new BigDecimal("100.00"), creator.getTotalDonationsBrl());

        verify(ledgerRepository).save(argThat(ledger ->
                ledger.getPlatformFeeBrl().compareTo(new BigDecimal("17.00")) == 0 &&
                ledger.getCreatorNetBrl().compareTo(new BigDecimal("83.00")) == 0 &&
                ledger.getTransactionType() == TransactionType.DOACAO
        ));
    }

    @Test
    @DisplayName("Arredonda a taxa de plataforma em centavos com HALF_UP")
    void shouldRoundDonationSplitToCentsUsingHalfUp() {
        when(ledgerRepository.findByPaymentExternalId("PAY_ROUNDING")).thenReturn(Optional.empty());
        when(creatorRepository.findByIdForUpdate(creatorId)).thenReturn(Optional.of(creator));
        when(donationRepository.save(any(DonationEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(ledgerRepository.save(any(FinancialLedgerEntity.class))).thenAnswer(i -> i.getArgument(0));

        DonationEntity result = monetizationService.processDonation(
                null, creatorId, null, null, new BigDecimal("0.05"), null, "PAY_ROUNDING"
        );

        assertEquals(new BigDecimal("0.01"), result.getPlatformFeeBrl());
        assertEquals(new BigDecimal("0.04"), result.getCreatorNetBrl());
        assertEquals(new BigDecimal("0.04"), creator.getWalletBalanceBrl());
    }

    @Test
    @DisplayName("Deve rejeitar doação duplicada pelo controle de idempotência do ledger")
    void shouldRejectDuplicateDonationDueToIdempotency() {
        when(ledgerRepository.findByPaymentExternalId("PAY_DUPLICATE"))
                .thenReturn(Optional.of(new FinancialLedgerEntity()));

        assertThrows(IllegalStateException.class, () ->
                monetizationService.processDonation(
                        userId, creatorId, null, null, new BigDecimal("50.00"), "Msg", "PAY_DUPLICATE"
                )
        );

        verify(donationRepository, never()).save(any());
    }

    @Test
    @DisplayName("Pagamento repetido não prolonga VIP nem duplica lançamento no ledger")
    void shouldNotExtendVipForDuplicatePayment() {
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(ledgerRepository.findByPaymentExternalId("MP_PAYMENT_123"))
                .thenReturn(Optional.of(new FinancialLedgerEntity()));

        UserEntity result = monetizationService.subscribePlatformVip(userId, "MP_PAYMENT_123");

        assertSame(user, result);
        verify(userRepository, never()).save(any(UserEntity.class));
        verify(ledgerRepository, never()).save(any(FinancialLedgerEntity.class));
    }

    @Test
    @DisplayName("Deve ativar Assinatura VIP da Plataforma (R$ 23) sem dar acesso antecipado a capítulos de autores")
    void shouldActivatePlatformVipSubscription() {
        when(ledgerRepository.findByPaymentExternalId("MP_PAYMENT_999")).thenReturn(Optional.empty());
        when(userRepository.findByIdForUpdate(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(ledgerRepository.save(any(FinancialLedgerEntity.class))).thenAnswer(i -> i.getArgument(0));

        UserEntity updatedUser = monetizationService.subscribePlatformVip(userId, "MP_PAYMENT_999");

        assertTrue(updatedUser.isVip());
        assertTrue(updatedUser.isVipActive());
        assertNotNull(updatedUser.getVipExpiresAt());

        verify(ledgerRepository).save(argThat(ledger ->
                ledger.getTransactionType() == TransactionType.ASSINATURA_VIP_PLATAFORMA &&
                ledger.getGrossAmountBrl().compareTo(new BigDecimal("23.00")) == 0 &&
                ledger.getCreator() == null // VIP é mantenedor da plataforma, não de autor específico
        ));
    }
}
