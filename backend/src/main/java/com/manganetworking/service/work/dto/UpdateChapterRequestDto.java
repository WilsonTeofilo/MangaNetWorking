package com.manganetworking.service.work.dto;

import com.manganetworking.domain.enums.ChapterFormat;

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
 * formato e data de lançamento. Sem data, o capítulo fica publicado imediatamente; com data, fica
 * agendado — e o autor pode mudar a data depois.</p>
 */
public record UpdateChapterRequestDto(
        @NotBlank(message = "O título do capítulo é obrigatório")
        @Size(max = 200, message = "O título excede o limite de entrada")
        String title,

        String coverUrl,

        List<String> pages,

        @Size(max = 2000000, message = "O texto do capítulo excede o limite de 2 MB")
        String content,

        ChapterFormat format,

        /** Data de lançamento opcional: vazio = publica agora. */
        LocalDateTime publicReleaseAt
) {
}
