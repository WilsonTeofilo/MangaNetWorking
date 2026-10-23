package com.manganetworking.service.user.dto;

/**
 * Resultado do toggle de favorito/biblioteca (estrela).
 *
 * <p>Não confundir com {@link ToggleLikeResponseDto}, que é a curtida real da obra
 * (coração). Os dois sinais têm contadores independentes.</p>
 */
public record ToggleFavoriteResponseDto(
        boolean favorite,
        long totalFavorites
) {}
