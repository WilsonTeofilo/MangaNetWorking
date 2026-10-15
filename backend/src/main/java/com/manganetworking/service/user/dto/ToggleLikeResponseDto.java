package com.manganetworking.service.user.dto;

public record ToggleLikeResponseDto(
        boolean liked,
        long totalLikes
) {}
