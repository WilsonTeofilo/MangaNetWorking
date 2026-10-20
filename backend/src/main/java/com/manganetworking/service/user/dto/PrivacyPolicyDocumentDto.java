package com.manganetworking.service.user.dto;

/**
 * Texto oficial da Política de Privacidade efetivamente publicado.
 * <p>
 * O documento só existe depois de um procedimento controlado de publicação
 * (aprovação legal + installation do arquivo + registro de auditoria). Enquanto
 * não há documento aprovado, o serviço devolve {@code Optional.empty()} e a API
 * responde {@code 404 POLICY_NOT_PUBLISHED} — nunca um texto fictício.
 * </p>
 *
 * @param version          versão da política (deve coincidir com a versão exigida no aceite)
 * @param effectiveDate    data de vigência declarada na aprovação
 * @param approvedBy       autoridade que aprovou o texto
 * @param approvalReference identificador da aprovação (ata, contrato, e-mail corporativo)
 * @param sha256           hash do arquivo publicado (integridade auditável)
 * @param content          corpo do documento em Markdown
 */
public record PrivacyPolicyDocumentDto(
        String version,
        String effectiveDate,
        String approvedBy,
        String approvalReference,
        String sha256,
        String content
) {
}
