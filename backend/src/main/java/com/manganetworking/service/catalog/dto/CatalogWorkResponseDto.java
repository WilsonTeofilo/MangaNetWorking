package com.manganetworking.service.catalog.dto;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.WorkFormat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Item de catálogo com o formato como primeiro eixo de leitura.
 *
 * <p>Campos explícitos (allow-list): nada de entidade JPA serializada. O card do front usa
 * {@code format} para o badge, {@code totalChapters} para os metadados e
 * {@code authorName}/{@code coverUrl} para a identificação.</p>
 */
public record CatalogWorkResponseDto(
        UUID id,
        String slug,
        String title,
        String originalTitle,
        String synopsis,
        String coverUrl,
        WorkFormat format,
        List<Genre> genres,
        String status,
        int totalChapters,
        long totalViews,
        long totalFavorites,
        long totalLikes,
        long totalComments,
        String authorName,
        String authorHandle,
        String authorAvatarUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
