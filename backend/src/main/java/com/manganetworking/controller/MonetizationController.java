package com.manganetworking.controller;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.domain.relational.DonationEntity;
import com.manganetworking.domain.relational.MembershipSubscriptionEntity;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.service.monetization.MonetizationService;
import com.manganetworking.service.monetization.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/monetization")
public class MonetizationController {

    private final MonetizationService monetizationService;
    private final FinancialLedgerRepository ledgerRepository;
    private final PlatformProperties properties;

    public MonetizationController(
            MonetizationService monetizationService,
            FinancialLedgerRepository ledgerRepository,
            PlatformProperties properties
    ) {
        this.monetizationService = monetizationService;
        this.ledgerRepository = ledgerRepository;
        this.properties = properties;
    }

    @PostMapping("/donate")
    public ResponseEntity<DonateResponseDto> createDonation(@Valid @RequestBody DonateRequestDto dto) {
        // Identidade do doador vem exclusivamente da sessão — nunca do corpo controlado pelo cliente.
        UUID donorUserId = SecurityContextUtils.requireCurrentUserId();
        String paymentId = dto.paymentExternalId() != null && !dto.paymentExternalId().isBlank()
                ? dto.paymentExternalId()
                : "PIX_DONATE_" + UUID.randomUUID();

        DonationEntity donation = monetizationService.processDonation(
                donorUserId,
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
                "Doação realizada com sucesso! O repasse líquido foi creditado ao autor."
        ));
    }

    @PostMapping("/membership/subscribe")
    public ResponseEntity<SubscribeMembershipResponseDto> subscribeMembership(@Valid @RequestBody SubscribeMembershipRequestDto dto) {
        // Assinante resolvido pela sessão (evita assinar em nome de outro usuário).
        UUID subscriberUserId = SecurityContextUtils.requireCurrentUserId();
        String paymentId = dto.paymentExternalId() != null && !dto.paymentExternalId().isBlank()
                ? dto.paymentExternalId()
                : "MEMBERSHIP_" + UUID.randomUUID();

        MembershipSubscriptionEntity sub = monetizationService.subscribeMembership(
                subscriberUserId,
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
            @RequestBody(required = false) Map<String, String> body
    ) {
        // Assinante VIP resolvido pela sessão (o header antigo era forjável pelo cliente).
        UUID effectiveUserId = SecurityContextUtils.requireCurrentUserId();
        String paymentId = (body != null && body.containsKey("paymentExternalId") && !body.get("paymentExternalId").isBlank())
                ? body.get("paymentExternalId")
                : "VIP_SUB_" + UUID.randomUUID();

        var user = monetizationService.subscribePlatformVip(effectiveUserId, paymentId);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("status", "ACTIVE");
        response.put("isVip", user.isVip());
        response.put("vipExpiresAt", user.getVipExpiresAt());
        // Preço autoritativo da configuração (platform.vip-price), não uma constante duplicada no código.
        response.put("monthlyPriceBrl", properties.getVipPrice());
        response.put("message", "Assinatura VIP MangaNetWorking ativada! Anúncios foram 100% desativados para sua conta.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ledger/{creatorId}")
    public ResponseEntity<List<LedgerEntryResponseDto>> getCreatorLedger(@PathVariable UUID creatorId) {
        // Extrato financeiro é dado privado do autor. A identidade do criador vem da SESSÃO (não do
        // path) e precisa coincidir com o criador consultado — antes, qualquer sessão autenticada lia
        // o extrato de qualquer criador, e a entidade serializada expunha CPF/chave PIX decifrados.
        UUID currentCreatorId = SecurityContextUtils.resolveCurrentCreatorId(null);
        if (currentCreatorId == null || !currentCreatorId.equals(creatorId)) {
            throw new AccessDeniedException(
                    "Você só pode consultar o extrato financeiro da sua própria conta de autor.");
        }

        List<LedgerEntryResponseDto> ledger = ledgerRepository
                .findAllByCreatorIdOrderByCreatedAtDesc(creatorId)
                .stream()
                .map(LedgerEntryResponseDto::from)
                .toList();
        return ResponseEntity.ok(ledger);
    }
}
