package com.manganetworking.service.creator.dto;

import jakarta.validation.constraints.Size;

public record UpdateCreatorIdentityRequestDto(
        @Size(max = 100, message = "O nome deve ter no máximo 100 caracteres")
        String name,

        @Size(max = 500, message = "A bio deve ter no máximo 500 caracteres")
        String bio,

        String instagramUrl,
        String youtubeUrl,
        String portfolioUrl,
        String avatarUrl
) {}
