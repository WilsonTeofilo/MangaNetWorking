package com.manganetworking.service;

import com.manganetworking.domain.enums.PaymentStatus;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.relational.*;
import com.manganetworking.repository.jpa.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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

    @InjectMocks
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
    }

    @Test
    @DisplayName("Deve processar doação com split exato: 83% para o criador e 17% taxa da plataforma")
    void shouldProcessDonationWithExactSplit() {
        when(ledgerRepository.findByPaymentExternalId("PAY_123")).thenReturn(Optional.empty());
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(creator));
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
    @DisplayName("Deve ativar Assinatura VIP da Plataforma (R$ 23) sem dar acesso antecipado a capítulos de autores")
    void shouldActivatePlatformVipSubscription() {
        when(ledgerRepository.findByPaymentExternalId("VIP_PIX_999")).thenReturn(Optional.empty());
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.save(any(UserEntity.class))).thenAnswer(i -> i.getArgument(0));
        when(ledgerRepository.save(any(FinancialLedgerEntity.class))).thenAnswer(i -> i.getArgument(0));

        UserEntity updatedUser = monetizationService.subscribePlatformVip(userId, "VIP_PIX_999");

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
