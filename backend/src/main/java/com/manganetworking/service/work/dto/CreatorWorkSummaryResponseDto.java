package com.manganetworking.service.work.dto;

import java.util.UUID;

/**
 * Resumo de uma obra para a lista "Minhas obras" do autor.
 *
 * @param id             identificador da obra
 * @param title          título
 * @param slug           slug público
 * @param coverUrl       capa
 * @param bannerUrl      banner
 * @param status         estado (rascunho, em lançamento, concluída)
 * @param totalChapters  capítulos publicados
 * @param totalViews     visualizações
 * @param totalLikes     curtidas
 */
public record CreatorWorkSummaryResponseDto(
        UUID id,
        String title,
        String slug,
        String synopsis,
        String coverUrl,
        String bannerUrl,
        String status,
        /** Formato da obra: MANGA (paginas) ou LIGHT_NOVEL (prosa). */
        String format,
        int totalChapters,
        long totalViews,
        long totalLikes,
        long totalFavorites
) {
}
