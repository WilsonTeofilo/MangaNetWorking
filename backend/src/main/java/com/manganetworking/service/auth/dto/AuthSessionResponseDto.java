package com.manganetworking.service.auth.dto;

import java.util.UUID;

/**
 * Sessão autenticada devolvida após a confirmação do 2FA.
 *
 * <p>Traz o username (identificador público e segunda via de login) e o sexo declarado,
 * para que o front já monte o perfil sem nova chamada.</p>
 */
public record AuthSessionResponseDto(
        UUID id,
        String name,
        String email,
        String username,
        String avatarUrl,
        boolean isCreator,
        UUID creatorId,
        String creatorHandle,
        boolean isModerator,
        boolean isOwner,
        String sex
) {
}
