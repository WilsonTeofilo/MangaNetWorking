package com.manganetworking.service.work.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Comentário de uma obra ou capítulo.
 *
 * <p>O username do autor é sempre exibido (identidade pública do comentário). Nome,
 * avatar e demais dados do perfil só aparecem quando o autor mantém o perfil público.
 * O selo {@code subscriber} é decidido no servidor: assinatura ativa e não expirada
 * do criador dono da obra, nunca um campo enviado pelo cliente.</p>
 */
public record WorkCommentResponseDto(
        String id,
        String parentId,
        String username,
        String displayName,
        String avatarUrl,
        boolean profilePublic,
        boolean isCreator,
        boolean subscriber,
        String body,
        long likesCount,
        long replyCount,
        boolean likedByMe,
        boolean mine,
        boolean edited,
        boolean deleted,
        LocalDateTime createdAt,
        LocalDateTime editedAt,
        List<WorkCommentResponseDto> replies
) {
}
