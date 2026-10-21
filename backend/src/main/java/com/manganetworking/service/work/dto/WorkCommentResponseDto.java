package com.manganetworking.service.work.dto;

import java.time.LocalDateTime;

/**
 * Comentário de uma obra.
 *
 * <p>O username do autor é sempre exibido (é a identidade pública do comentário). Nome,
 * avatar e demais dados do perfil só aparecem quando o autor mantém o perfil público —
 * perfil privado continua comentando, mas não expõe nada além do username.</p>
 */
public record WorkCommentResponseDto(
        String id,
        String username,
        String displayName,
        String avatarUrl,
        boolean profilePublic,
        boolean isCreator,
        String body,
        LocalDateTime createdAt
) {
}
