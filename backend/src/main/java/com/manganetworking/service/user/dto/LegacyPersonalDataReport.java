package com.manganetworking.service.user.dto;

import java.util.List;
import java.util.UUID;

/**
 * Resultado da auditoria de dados pessoais legados (CPF sentinela/inválido).
 *
 * @param scanned             criadores analisados
 * @param legacyEntries       registros com CPF ausente de validação estrutural
 * @param requiresHumanDecision registros que não podem ser saneados automaticamente
 *                            (criador já monetizado: mexer no CPF muda a identidade fiscal)
 * @param purged              registros efetivamente saneados (CPF removido)
 * @param dryRun              {@code true} quando nada foi alterado
 */
public record LegacyPersonalDataReport(
        int scanned,
        List<LegacyPersonalDataEntry> legacyEntries,
        List<LegacyPersonalDataEntry> requiresHumanDecision,
        int purged,
        boolean dryRun
) {

    /**
     * Registro legacy detectado. O CPF não é devolvido: é dado fiscal cifrado e o objetivo é
     * saneamento, não leitura.
     *
     * @param creatorId        identificador do criador
     * @param userId           usuário dono do perfil de criador
     * @param handle           identificador público do criador
     * @param email            e-mail do titular (necessário para a decisão humana)
     * @param monetized        já chegou ao nível de monetização (exige decisão humana)
     * @param reason           motivo da reprovação do CPF
     */
    public record LegacyPersonalDataEntry(
            UUID creatorId,
            UUID userId,
            String handle,
            String email,
            boolean monetized,
            String reason
    ) {
    }
}
