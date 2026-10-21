package com.manganetworking.service.user.dto;

import java.time.LocalDateTime;

/**
 * Perfil público de um usuário, visto por outra pessoa.
 *
 * <p>Regra de privacidade: quando o titular mantém o perfil <strong>privado</strong>, a
 * resposta carrega apenas o username (é o que aparece nos comentários) e o resto vem
 * nulo — sem nome, avatar, links, obras ou contadores.</p>
 */
public record PublicProfileResponseDto(
        String username,
        String displayName,
        String avatarUrl,
        boolean isCreator,
        boolean profilePublic,
        String creatorHandle,
        String bio,
        String instagramUrl,
        String youtubeUrl,
        String portfolioUrl,
        long followerCount,
        long publicWorkCount,
        long likedWorkCount,
        LocalDateTime joinedAt
) {
}
