package com.manganetworking.service.user;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.service.user.dto.LegacyPersonalDataReport;
import com.manganetworking.service.user.dto.LegacyPersonalDataReport.LegacyPersonalDataEntry;
import com.manganetworking.util.CpfValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Saneamento controlado de dados pessoais legados (item 48 do roadmap).
 * <p>
 * O CPF é cifrado em repouso (AES-256-GCM) e por isso não pode ser inspecionado por SQL:
 * a detecção e a remoção acontecem no servidor, com o valor descriptografado pela camada JPA.
 * </p>
 * <p>
 * Regras de segurança operacional:
 * </p>
 * <ul>
 *   <li>sempre {@code dry-run} por padrão: a mutação exige pedido explícito;</li>
 *   <li>criador já monetizado NÃO é saneado automaticamente (o CPF está ligado a repasses
 *       e identidade fiscal): vai para a fila de decisão humana;</li>
 *   <li>toda ação fica registrada em {@code privacy_governance_actions}, que é append-only.</li>
 * </ul>
 */
@Service
public class LegacyPersonalDataService {

    private static final Logger log = LoggerFactory.getLogger(LegacyPersonalDataService.class);

    /** Nível a partir do qual o criador pode monetizar (exige CPF válido). */
    private static final int MONETIZATION_LEVEL_REQUIRING_CPF = 2;

    private final CreatorRepository creatorRepository;
    private final JdbcTemplate jdbcTemplate;

    public LegacyPersonalDataService(
            CreatorRepository creatorRepository,
            JdbcTemplate jdbcTemplate
    ) {
        this.creatorRepository = creatorRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Audita os criadores e, quando {@code apply} for verdadeiro, remove o CPF inválido
     * (sentinela) de quem ainda não monetiza.
     *
     * @param actorUserId usuário responsável pela ação (proprietário autenticado)
     * @param apply       {@code false} executa apenas o relatório (dry-run)
     */
    @Transactional
    public LegacyPersonalDataReport auditAndSanitize(UUID actorUserId, boolean apply) {
        List<CreatorEntity> creators = creatorRepository.findAll();
        List<LegacyPersonalDataEntry> legacy = new ArrayList<>();
        List<LegacyPersonalDataEntry> requiresHumanDecision = new ArrayList<>();
        int purged = 0;

        for (CreatorEntity creator : creators) {
            String cpf = creator.getDocumentCpf();
            if (cpf == null || cpf.isBlank()) {
                continue;
            }
            if (CpfValidator.isValid(cpf)) {
                continue;
            }
            UserEntity user = creator.getUser();
            UUID userId = user == null ? null : user.getId();
            boolean monetized = creator.getMonetizationLevel() != null
                    && creator.getMonetizationLevel() >= MONETIZATION_LEVEL_REQUIRING_CPF;
            LegacyPersonalDataEntry entry = new LegacyPersonalDataEntry(
                    creator.getId(),
                    userId,
                    creator.getHandle(),
                    user == null ? null : user.getEmail(),
                    monetized,
                    "CPF reprovado na validação estrutural (dado sentinela ou inválido)"
            );
            legacy.add(entry);

            if (monetized) {
                requiresHumanDecision.add(entry);
                continue;
            }
            if (apply) {
                creator.setDocumentCpf(null);
                creatorRepository.save(creator);
                recordAction(actorUserId, "LEGACY_CPF_PURGED", userId, creator.getId(),
                        "Motivo: CPF inválido removido; nível de monetização: " + creator.getMonetizationLevel());
                purged++;
            }
        }

        if (apply) {
            recordAction(actorUserId, "LEGACY_CPF_AUDIT_APPLIED", null, null,
                    "Criadores varridos: " + creators.size()
                            + "; legados detectados: " + legacy.size()
                            + "; saneados: " + purged
                            + "; aguardando decisão humana: " + requiresHumanDecision.size());
            log.info("[PRIVACIDADE] Saneamento de CPF legado aplicado: {} registros saneados, {} aguardando decisão humana.",
                    purged, requiresHumanDecision.size());
        } else {
            recordAction(actorUserId, "LEGACY_CPF_AUDIT_DRY_RUN", null, null,
                    "Dry-run: criadores varridos: " + creators.size() + "; legados detectados: " + legacy.size());
        }

        return new LegacyPersonalDataReport(
                creators.size(),
                legacy,
                requiresHumanDecision,
                purged,
                !apply
        );
    }

    private void recordAction(UUID actorUserId, String action, UUID targetUserId, UUID targetCreatorId, String details) {
        jdbcTemplate.update("""
                INSERT INTO privacy_governance_actions (action, actor_user_id, target_user_id, target_creator_id, details)
                VALUES (?, ?, ?, ?, jsonb_build_object('note', ?))
                """, action, actorUserId, targetUserId, targetCreatorId, details == null ? "" : details);
    }
}
