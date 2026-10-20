package com.manganetworking.controller;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.repository.jpa.FinancialLedgerRepository;
import com.manganetworking.service.monetization.dto.LedgerEntryResponseDto;
import com.manganetworking.service.monetization.MercadoPagoService;
import com.manganetworking.service.monetization.dto.DonationCheckoutRequestDto;
import com.manganetworking.service.monetization.dto.MembershipCheckoutRequestDto;
import com.manganetworking.service.monetization.dto.CheckoutResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/monetization")
public class MonetizationController {

    private final FinancialLedgerRepository ledgerRepository;
    private final MercadoPagoService mercadoPagoService;

    public MonetizationController(FinancialLedgerRepository ledgerRepository, MercadoPagoService mercadoPagoService) {
        this.ledgerRepository = ledgerRepository;
        this.mercadoPagoService = mercadoPagoService;
    }

    @PostMapping("/donations/checkout")
    public ResponseEntity<CheckoutResponseDto> createDonationCheckout(@Valid @RequestBody DonationCheckoutRequestDto dto) {
        UUID payerUserId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(mercadoPagoService.createDonationCheckoutPreference(payerUserId, dto.creatorId(),
                dto.workId(), dto.chapterId(), dto.amountBrl(), dto.message(), dto.idempotencyKey()));
    }

    @PostMapping("/membership/checkout")
    public ResponseEntity<CheckoutResponseDto> createMembershipCheckout(@Valid @RequestBody MembershipCheckoutRequestDto dto) {
        UUID payerUserId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(mercadoPagoService.createMembershipCheckoutPreference(payerUserId,
                dto.creatorId(), dto.idempotencyKey()));
    }

    @PostMapping("/donate")
    public ResponseEntity<Void> createDonation() {
        return ResponseEntity.status(org.springframework.http.HttpStatus.GONE).build();
    }

    @PostMapping("/membership/subscribe")
    public ResponseEntity<Void> subscribeMembership() {
        return ResponseEntity.status(org.springframework.http.HttpStatus.GONE).build();
    }

    @PostMapping("/vip/subscribe")
    public ResponseEntity<Map<String, Object>> subscribeVip() {
        return ResponseEntity.status(org.springframework.http.HttpStatus.GONE).build();
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
