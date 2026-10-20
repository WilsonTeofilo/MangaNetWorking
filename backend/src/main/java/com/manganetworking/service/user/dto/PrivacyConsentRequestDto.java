package com.manganetworking.service.user.dto;

import jakarta.validation.constraints.NotBlank;

public record PrivacyConsentRequestDto(@NotBlank String version) {}
