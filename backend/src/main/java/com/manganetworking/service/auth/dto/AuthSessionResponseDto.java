package com.manganetworking.service.auth.dto;

import java.util.UUID;

public record AuthSessionResponseDto(
        UUID id,
        String name,
        String email,
        String avatarUrl,
        boolean isCreator,
        UUID creatorId,
        String creatorHandle,
        boolean isModerator
) {}
