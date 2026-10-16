package com.manganetworking.controller;

import com.manganetworking.domain.relational.DonationEntity;
import com.manganetworking.domain.relational.FinancialLedgerEntity;
import com.manganetworking.domain.relational.MembershipSubscriptionEntity;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.service.MonetizationService;
import com.manganetworking.service.monetization.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/monetization")
public class MonetizationController {

    private final MonetizationService monetizationService;
    private final FinancialLedgerRepository ledgerRepository;

    public MonetizationController(
            MonetizationService monetizationService,
            FinancialLedgerRepository ledgerRepository
    ) {
        this.monetizationService = monetizationService;
        this.ledgerRepository = ledgerRepository;
    }

    @PostMapping("/donate")
    public ResponseEntity<DonateResponseDto> createDonation(@Valid @RequestBody DonateRequestDto dto) {
        String paymentId = dto.paymentExternalId() != null && !dto.paymentExternalId().isBlank()
                ? dto.paymentExternalId()
                : "PIX_DONATE_" + UUID.randomUUID();

        DonationEntity donation = monetizationService.processDonation(
                dto.donorUserId(),
                dto.creatorId(),
                dto.workId(),
                dto.chapterId(),
                dto.amountBrl(),
                dto.message(),
                paymentId
        );

        return ResponseEntity.ok(new DonateResponseDto(
                "APPROVED",
                donation.getId(),
                donation.getGrossAmountBrl(),
                donation.getPlatformFeeBrl(),
                donation.getCreatorNetBrl(),
                "Doação realizada com sucesso! 83% foi repassado ao autor."
        ));
    }

    @PostMapping("/membership/subscribe")
    public ResponseEntity<SubscribeMembershipResponseDto> subscribeMembership(@Valid @RequestBody SubscribeMembershipRequestDto dto) {
        String paymentId = dto.paymentExternalId() != null && !dto.paymentExternalId().isBlank()
                ? dto.paymentExternalId()
                : "MEMBERSHIP_" + UUID.randomUUID();

        MembershipSubscriptionEntity sub = monetizationService.subscribeMembership(
                dto.subscriberUserId(),
                dto.creatorId(),
                paymentId
        );

        return ResponseEntity.ok(new SubscribeMembershipResponseDto(
                "ACTIVE",
                sub.getId(),
                sub.getMonthlyPriceBrl(),
                sub.getExpiresAt(),
                "Você agora é membro oficial! Acesso antecipado desbloqueado."
        ));
    }

    @PostMapping("/vip/subscribe")
    public ResponseEntity<Map<String, Object>> subscribeVip(
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID userId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        UUID effectiveUserId = com.manganetworking.config.security.SecurityContextUtils.resolveCurrentUserId(userId);
        String paymentId = (body != null && body.containsKey("paymentExternalId") && !body.get("paymentExternalId").isBlank())
                ? body.get("paymentExternalId")
                : "VIP_SUB_" + UUID.randomUUID();

        var user = monetizationService.subscribePlatformVip(effectiveUserId, paymentId);

        return ResponseEntity.ok(Map.of(
                "status", "ACTIVE",
                "isVip", user.isVip(),
                "vipExpiresAt", user.getVipExpiresAt(),
                "monthlyPriceBrl", MonetizationService.PLATFORM_VIP_PRICE_BRL,
                "message", "Assinatura VIP MangaNetWorking ativada! Anúncios foram 100% desativados para sua conta."
        ));
    }

    @GetMapping("/ledger/{creatorId}")
    public ResponseEntity<List<FinancialLedgerEntity>> getCreatorLedger(@PathVariable UUID creatorId) {
        return ResponseEntity.ok(ledgerRepository.findAllByCreatorIdOrderByCreatedAtDesc(creatorId));
    }
}
