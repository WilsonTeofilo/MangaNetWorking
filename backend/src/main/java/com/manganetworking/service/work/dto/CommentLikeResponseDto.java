package com.manganetworking.service.work.dto;

/** Resultado do toggle de curtida de um comentário. */
public record CommentLikeResponseDto(boolean liked, long likesCount) {
}
