package com.manganetworking.service.work.dto;

import java.util.List;

/** Página estável de comentários de primeiro nível. As respostas vêm sob cada item. */
public record CommentPageResponseDto(
        List<WorkCommentResponseDto> items,
        int page,
        int size,
        long total,
        boolean hasMore
) {
}
