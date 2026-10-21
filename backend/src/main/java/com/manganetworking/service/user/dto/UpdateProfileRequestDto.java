package com.manganetworking.service.user.dto;

import jakarta.validation.constraints.Size;

/**
 * Atualização do perfil da sessão corrente.
 *
 * <p>O username só pode ser definido <strong>uma vez</strong> e apenas enquanto a conta ainda
 * usa o identificador gerado automaticamente ({@code user_<id>}) — depois de escolhido, ele é
 * imutável, porque é o endereço público do perfil e a segunda via de login.</p>
 */
public record UpdateProfileRequestDto(
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
        String name,

        String avatarUrl,

        Boolean isProfilePublic,

        @Size(min = 3, max = 30, message = "O username deve ter entre 3 e 30 caracteres")
        String username
) {
}
