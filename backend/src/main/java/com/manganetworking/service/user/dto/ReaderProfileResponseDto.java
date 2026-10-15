package com.manganetworking.service.user.dto;

import java.util.List;
import java.util.UUID;

public record ReaderProfileResponseDto(
        UUID id,
        String name,
        String avatarUrl,
        boolean isProfilePublic,
        boolean isCreator,
        String memberSince,
        int likedWorksCount,
        List<LikedWorkSummaryDto> likedWorks
) {}
