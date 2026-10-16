package com.manganetworking.service.mobile.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OfflineDownloadManifestDto(
        UUID chapterId,
        String workTitle,
        Integer chapterNumber,
        String chapterTitle,
        List<String> pages,
        String clientEncryptionKeyId,
        boolean requiresSecureWindow,
        LocalDateTime offlineLicenseExpiresAt,
        String notice
) {}
