package com.manganetworking.service.work.dto;

import java.util.UUID;

public record ChapterReadResponseDto(
        boolean locked,
        UUID chapterId,
        String workTitle,
        int chapterNumber,
        String chapterTitle,
        String pagesJson,
        long likes,
        String authorHandle,
        UUID authorId
) {}
