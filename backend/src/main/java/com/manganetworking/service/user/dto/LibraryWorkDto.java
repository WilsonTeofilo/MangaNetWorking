package com.manganetworking.service.user.dto;

import java.util.UUID;

/**
 * Item da biblioteca do leitor (obras favoritadas).
 *
 * <p>Traz o mínimo para montar o card da biblioteca sem depender de dados mock do front:
 * identificação da obra, capa, autor e total de capítulos. O progresso de leitura é
 * combinado no cliente com {@code GET /api/users/reading-progress} — que já é o contrato
 * do MongoDB — para decidir entre "continuar de onde parou" e "ler novamente".</p>
 */
public record LibraryWorkDto(
        UUID id,
        String title,
        String slug,
        String coverUrl,
        String authorName,
        String authorHandle,
        int totalChapters,
        String status,
        String format
) {
}
