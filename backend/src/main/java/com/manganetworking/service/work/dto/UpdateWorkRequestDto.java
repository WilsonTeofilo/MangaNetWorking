package com.manganetworking.service.work.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.WorkFormat;

import java.util.List;

/**
 * Atualização de uma obra pelo próprio autor.
 *
 * <p>Cobre a configuração da obra (capa, banner, categorias, título e sinopse) e o
 * estado de publicação. Não mexe em capítulos: cada capítulo é publicado no fluxo
 * próprio (selecionar a obra → subir as páginas → capa do capítulo → publicar).</p>
 */
public record UpdateWorkRequestDto(
        @NotBlank(message = "O título é obrigatório")
        @Size(max = 200, message = "O título excede o limite de entrada")
        String title,

        @NotBlank(message = "A sinopse é obrigatória")
        @Size(min = 100, max = 500, message = "A sinopse deve ter entre 100 e 500 caracteres")
        String synopsis,

        @NotBlank(message = "A capa é obrigatória")
        @Size(max = 500, message = "A capa excede o limite de entrada")
        String coverUrl,

        @Size(max = 500, message = "O banner excede o limite de entrada")
        String bannerUrl,

        List<Genre> genres,

        WorkFormat format,

        /** Estado da obra: {@code ongoing} (publicada), {@code draft} (rascunho) ou {@code completed}. */
        @Size(max = 20, message = "O estado excede o limite de entrada")
        String status
) {
}
