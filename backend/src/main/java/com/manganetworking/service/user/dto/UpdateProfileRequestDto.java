package com.manganetworking.service.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequestDto(
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
        String name,

        String avatarUrl,

        Boolean isProfilePublic
) {}
