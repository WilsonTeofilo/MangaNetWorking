package com.manganetworking.service.monetization.dto;

import com.manganetworking.domain.enums.TransactionType;
import com.manganetworking.domain.relational.FinancialLedgerEntity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entrada do extrato financeiro do autor (ledger append-only).
 *
 * <p>Exposição deliberadamente restrita: NÃO inclui o criador nem o usuário associados.
 * Serializar a entidade {@code FinancialLedgerEntity} diretamente propagava
 * {@code CreatorEntity.documentCpf} e {@code CreatorEntity.pixKey} — que o
 * {@code AesCryptoConverter} decifra na leitura — e o identificador do pagador.</p>
 */
public record LedgerEntryResponseDto(
        UUID id,
        TransactionType transactionType,
        BigDecimal grossAmountBrl,
        BigDecimal feeRatePercent,
        BigDecimal platformFeeBrl,
        BigDecimal creatorNetBrl,
        BigDecimal walletBalanceAfterBrl,
        String description,
        LocalDateTime createdAt
) {

    public static LedgerEntryResponseDto from(FinancialLedgerEntity entry) {
        return new LedgerEntryResponseDto(
                entry.getId(),
                entry.getTransactionType(),
                entry.getGrossAmountBrl(),
                entry.getFeeRatePercent(),
                entry.getPlatformFeeBrl(),
                entry.getCreatorNetBrl(),
                entry.getWalletBalanceAfterBrl(),
                entry.getDescription(),
                entry.getCreatedAt()
        );
    }
}
