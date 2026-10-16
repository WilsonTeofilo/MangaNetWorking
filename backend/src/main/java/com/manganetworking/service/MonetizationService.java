package com.manganetworking.service;

import com.manganetworking.domain.enums.PaymentStatus;
import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.relational.*;
import com.manganetworking.repository.jpa.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class MonetizationService {

    private static final Logger log = LoggerFactory.getLogger(MonetizationService.class);

    public static final BigDecimal PLATFORM_FEE_RATE = new BigDecimal("0.17"); // 17%
    public static final BigDecimal CREATOR_NET_RATE = new BigDecimal("0.83"); // 83%
    public static final BigDecimal MIN_MEMBERSHIP_PRICE = new BigDecimal("7.99");
    public static final BigDecimal MAX_MEMBERSHIP_PRICE = new BigDecimal("45.99");

    private final DonationRepository donationRepository;
    private final MembershipSubscriptionRepository membershipRepository;
    private final FinancialLedgerRepository ledgerRepository;
    private final CreatorRepository creatorRepository;
    private final UserRepository userRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;

    public MonetizationService(
            DonationRepository donationRepository,
            MembershipSubscriptionRepository membershipRepository,
            FinancialLedgerRepository ledgerRepository,
            CreatorRepository creatorRepository,
            UserRepository userRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository
    ) {
        this.donationRepository = donationRepository;
        this.membershipRepository = membershipRepository;
        this.ledgerRepository = ledgerRepository;
        this.creatorRepository = creatorRepository;
        this.userRepository = userRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
    }

    /**
     * Processa uma doação com split transparente de 17% e gravação no ledger com idempotência
     */
    @Transactional
    public DonationEntity processDonation(
            UUID donorUserId,
            UUID creatorId,
            UUID workId,
            UUID chapterId,
            BigDecimal grossAmountBrl,
            String message,
            String paymentExternalId
    ) {
        // Checagem de Idempotência
        if (ledgerRepository.findByPaymentExternalId(paymentExternalId).isPresent()) {
            throw new IllegalStateException("Transação de pagamento já foi processada anteriormente: " + paymentExternalId);
        }

        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("Criador não encontrado: " + creatorId));

        UserEntity donor = donorUserId != null ? userRepository.findById(donorUserId).orElse(null) : null;
        WorkEntity work = workId != null ? workRepository.findById(workId).orElse(null) : null;
        ChapterEntity chapter = chapterId != null ? chapterRepository.findById(chapterId).orElse(null) : null;

        // Split Financeiro: 17% para MangaNetWorking, 83% repasse líquido ao Criador
        BigDecimal platformFee = grossAmountBrl.multiply(PLATFORM_FEE_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal creatorNet = grossAmountBrl.subtract(platformFee);

        // Atualizar saldo líquido da carteira do criador
        BigDecimal newBalance = creator.getWalletBalanceBrl().add(creatorNet);
        creator.setWalletBalanceBrl(newBalance);
        creator.setTotalDonationsBrl(creator.getTotalDonationsBrl().add(grossAmountBrl));
        creatorRepository.save(creator);

        // Criar registro da doação
        DonationEntity donation = new DonationEntity();
        donation.setDonor(donor);
        donation.setCreator(creator);
        donation.setWork(work);
        donation.setChapter(chapter);
        donation.setGrossAmountBrl(grossAmountBrl);
        donation.setPlatformFeeBrl(platformFee);
        donation.setCreatorNetBrl(creatorNet);
        donation.setMessage(message);
        donation.setStatus(PaymentStatus.APROVADO);
        donation.setPaymentExternalId(paymentExternalId);
        donationRepository.save(donation);

        // Gravar no Ledger Idempotente
        FinancialLedgerEntity ledger = new FinancialLedgerEntity();
        ledger.setPaymentExternalId(paymentExternalId);
        ledger.setCreator(creator);
        ledger.setTransactionType(TransactionType.DOACAO);
        ledger.setGrossAmountBrl(grossAmountBrl);
        ledger.setFeeRatePercent(new BigDecimal("17.00"));
        ledger.setPlatformFeeBrl(platformFee);
        ledger.setCreatorNetBrl(creatorNet);
        ledger.setWalletBalanceAfterBrl(newBalance);
        ledger.setDescription("Doação de leitor: " + (message != null ? message : "Apoio direto"));
        ledgerRepository.save(ledger);

        log.info("[MONETIZAÇÃO] Doação processada. Bruto: R$ {}, Taxa (17%): R$ {}, Criador (83%): R$ {}",
                grossAmountBrl, platformFee, creatorNet);

        return donation;
    }

    /**
     * Assina o Clube de Membros do Criador (com acesso antecipado)
     */
    @Transactional
    public MembershipSubscriptionEntity subscribeMembership(
            UUID subscriberUserId,
            UUID creatorId,
            String paymentExternalId
    ) {
        if (ledgerRepository.findByPaymentExternalId(paymentExternalId).isPresent()) {
            throw new IllegalStateException("Assinatura já processada: " + paymentExternalId);
        }

        UserEntity subscriber = userRepository.findById(subscriberUserId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + subscriberUserId));

        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("Criador não encontrado: " + creatorId));

        BigDecimal monthlyPrice = creator.getMembershipPriceBrl();
        BigDecimal platformFee = monthlyPrice.multiply(PLATFORM_FEE_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal creatorNet = monthlyPrice.subtract(platformFee);

        // Atualizar saldo do criador
        BigDecimal newBalance = creator.getWalletBalanceBrl().add(creatorNet);
        creator.setWalletBalanceBrl(newBalance);
        creator.setMonthlyMembersCount(creator.getMonthlyMembersCount() + 1);
        creatorRepository.save(creator);

        LocalDateTime now = LocalDateTime.now();
        MembershipSubscriptionEntity sub = membershipRepository.findBySubscriberIdAndCreatorId(subscriberUserId, creatorId)
                .orElseGet(() -> {
                    MembershipSubscriptionEntity newSub = new MembershipSubscriptionEntity();
                    newSub.setSubscriber(subscriber);
                    newSub.setCreator(creator);
                    newSub.setStartsAt(now);
                    return newSub;
                });

        sub.setMonthlyPriceBrl(monthlyPrice);
        sub.setPlatformFeeBrl(platformFee);
        sub.setCreatorNetBrl(creatorNet);
        sub.setStatus("ACTIVE");
        sub.setExpiresAt(now.plusDays(30));
        membershipRepository.save(sub);

        // Gravar no Ledger
        FinancialLedgerEntity ledger = new FinancialLedgerEntity();
        ledger.setPaymentExternalId(paymentExternalId);
        ledger.setCreator(creator);
        ledger.setTransactionType(TransactionType.ASSINATURA_MEMBRO);
        ledger.setGrossAmountBrl(monthlyPrice);
        ledger.setFeeRatePercent(new BigDecimal("17.00"));
        ledger.setPlatformFeeBrl(platformFee);
        ledger.setCreatorNetBrl(creatorNet);
        ledger.setWalletBalanceAfterBrl(newBalance);
        ledger.setDescription("Assinatura mensal de membro: " + subscriber.getName());
        ledgerRepository.save(ledger);

        log.info("[MEMBROS] Nova assinatura ativada para o criador {} por R$ {}", creator.getHandle(), monthlyPrice);

        return sub;
    }

    /**
     * Atualiza o valor mensal do clube de membros (Validação de R$ 7,99 a R$ 45,99)
     */
    @Transactional
    public CreatorEntity updateMembershipPrice(UUID creatorId, BigDecimal newPriceBrl) {
        if (newPriceBrl.compareTo(MIN_MEMBERSHIP_PRICE) < 0 || newPriceBrl.compareTo(MAX_MEMBERSHIP_PRICE) > 0) {
            throw new IllegalArgumentException("O preço da assinatura deve estar entre R$ 7,99 e R$ 45,99.");
        }

        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new IllegalArgumentException("Criador não encontrado"));

        creator.setMembershipPriceBrl(newPriceBrl);
        return creatorRepository.save(creator);
    }

    public static final BigDecimal PLATFORM_VIP_PRICE_BRL = new BigDecimal("23.00");

    /**
     * Assinatura VIP da Plataforma (~R$ 23 / 30 dias)
     * Remove 100% dos anúncios no leitor e concede badge VIP.
     * NÃO concede acesso antecipado aos capítulos de criadores (reserva exclusiva do fã-clube do criador).
     */
    @Transactional
    public UserEntity subscribePlatformVip(UUID userId, String paymentExternalId) {
        if (ledgerRepository.findByPaymentExternalId(paymentExternalId).isPresent()) {
            throw new IllegalStateException("Assinatura VIP já processada: " + paymentExternalId);
        }

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado: " + userId));

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = (user.isVipActive() ? user.getVipExpiresAt() : now).plusDays(30);

        user.setVip(true);
        user.setVipExpiresAt(expiresAt);
        userRepository.save(user);

        // Gravar transação no Ledger Financeiro da Plataforma
        FinancialLedgerEntity ledger = new FinancialLedgerEntity();
        ledger.setPaymentExternalId(paymentExternalId);
        ledger.setUser(user);
        ledger.setCreator(null);
        ledger.setTransactionType(TransactionType.ASSINATURA_VIP_PLATAFORMA);
        ledger.setGrossAmountBrl(PLATFORM_VIP_PRICE_BRL);
        ledger.setFeeRatePercent(new BigDecimal("100.00"));
        ledger.setPlatformFeeBrl(PLATFORM_VIP_PRICE_BRL);
        ledger.setCreatorNetBrl(BigDecimal.ZERO);
        ledger.setWalletBalanceAfterBrl(BigDecimal.ZERO);
        ledger.setDescription("Assinatura VIP MangaNetWorking (Sem Anúncios): " + user.getName());
        ledgerRepository.save(ledger);

        log.info("[VIP PLATAFORMA] Assinatura VIP ativada para {} até {}", user.getEmail(), expiresAt);
        return user;
    }
}
