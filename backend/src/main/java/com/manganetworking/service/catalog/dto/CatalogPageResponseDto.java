package com.manganetworking.service.catalog.dto;

import java.util.List;

/**
 * Página do catálogo com contadores por formato.
 *
 * <p>Os contadores são calculados sobre o mesmo recorte (busca, gênero, status, público), mas
 * <strong>sem</strong> o filtro de formato. É o que permite mostrar "Mangá (12) · Light novel (3)"
 * sem uma segunda chamada e sem o número mentir quando o usuário troca o eixo.</p>
 */
public record CatalogPageResponseDto(
        List<CatalogWorkResponseDto> items,
        int page,
        int size,
        long total,
        int totalPages,
        long totalAll,
        long totalManga,
        long totalLightNovel
) {}
