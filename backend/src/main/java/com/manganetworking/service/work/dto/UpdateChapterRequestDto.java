package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.enums.ChapterType;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Edição de um capítulo pelo próprio autor.
 *
 * <p>Cobre o CRUD completo do capítulo: título, páginas (em nova ordem), capa, texto de prosa,
 * formato, data de lançamento, tipo do capítulo e blocos ordenados (light novel). Sem data, o capítulo fica
 * publicado imediatamente; com data, fica agendado — e o autor pode mudar a data depois.</p>
 */
public record UpdateChapterRequestDto(
        @NotBlank(message = "O título do capítulo é obrigatório")
        @Size(max = 200, message = "O título excede o limite de entrada")
        String title,

        String coverUrl,

        List<String> pages,

        @Size(max = 2000000, message = "O texto enviado excede o limite técnico de processamento")
        String content,

        ChapterFormat format,

        ChapterType chapterType,

        /** Data de lançamento opcional: vazio = publica agora. */
        LocalDateTime publicReleaseAt,

        // JSON de blocos ordenados para light novel (versão 1+). Exclusivo com content/pages.
        String blocksJson
) {
}