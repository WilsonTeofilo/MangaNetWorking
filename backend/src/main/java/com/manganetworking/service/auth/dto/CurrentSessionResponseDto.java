package com.manganetworking.service.auth.dto;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Read model da sessão corrente. Mantém o controller livre de acesso direto ao repositório
 * e concentra os dados de identidade/consentimento retornados por {@code GET /api/auth/me}.
 */
public record CurrentSessionResponseDto(
        UUID id,
        String name,
        String email,
        String avatarUrl,
        boolean isCreator,
        UUID creatorId,
        String creatorHandle,
        boolean isModerator,
        boolean isOwner,
        boolean isVip,
        LocalDateTime vipExpiresAt,
        boolean privacyConsentRequired,
        String privacyPolicyVersion
) {}
