package com.manganetworking.service.creator.dto;

import com.manganetworking.domain.enums.PixKeyType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdatePixKeyRequestDto(
        @NotBlank(message = "A chave PIX é obrigatória")
        @Size(max = 255, message = "A chave PIX deve ter no máximo 255 caracteres")
        String pixKey,

        @NotNull(message = "O tipo da chave PIX é obrigatório")
        PixKeyType pixKeyType,

        @NotBlank(message = "O código 2FA é obrigatório para alterar dados de recebimento (Step-Up)")
        @Size(min = 6, max = 6, message = "O código 2FA deve ter exatamente 6 dígitos")
        String twoFactorCode
) {}
