package com.manganetworking.service.creator.dto;

import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.nosql.CreatorMissionDocument;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record CreatorWorkspaceResponseDto(
        UUID id,
        String name,
        String avatarUrl,
        String bio,
        String handle,
        String username,
        String instagramUrl,
        String youtubeUrl,
        String portfolioUrl,
        int monetizationLevel,
        boolean monetizationUnlocked,
        BigDecimal walletBalanceBrl,
        BigDecimal totalDonationsBrl,
        int monthlyMembersCount,
        BigDecimal membershipPriceBrl,
        String pixKey,
        PixKeyType pixKeyType,
        boolean hasActiveBoost,
        double engagementBoostMul,
        List<CreatorMissionDocument> missions
) {}
