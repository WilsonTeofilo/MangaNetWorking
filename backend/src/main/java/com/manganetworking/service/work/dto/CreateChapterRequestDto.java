package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.ChapterFormat;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public record CreateChapterRequestDto(
        @NotNull(message = "O número do capítulo é obrigatório")
        @Min(value = 1, message = "O número do capítulo deve ser maior ou igual a 1")
        Integer chapterNumber,

        @NotBlank(message = "O título do capítulo é obrigatório")
        String title,

        String coverUrl,

        List<String> pages,

        // Data de lançamento OPCIONAL: vazio = publica imediatamente (padrão do produto).
        LocalDateTime publicReleaseAt,

        ChapterFormat format,

        @Size(max = 2000000, message = "O texto do capítulo excede o limite de 2 MB")
        String content
) {
    public CreateChapterRequestDto(Integer chapterNumber, String title, String coverUrl,
                                   List<String> pages, LocalDateTime publicReleaseAt) {
        this(chapterNumber, title, coverUrl, pages, publicReleaseAt, ChapterFormat.IMAGE_PAGES, null);
    }

    public CreateChapterRequestDto {
        if (format == null) format = ChapterFormat.IMAGE_PAGES;
    }
}
