package com.manganetworking.service.work.dto;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Estrutura versionada de blocos para capítulos de light novel.
 * Cada capítulo é uma lista ordenada de blocos: texto, ilustração ou separador.
 * A validação autoritativa é server-side; o front espelha para UX.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.EXISTING_PROPERTY, property = "type", visible = true)
@JsonSubTypes({
        @JsonSubTypes.Type(value = ChapterBlockDto.TextBlock.class, name = "text"),
        @JsonSubTypes.Type(value = ChapterBlockDto.IllustrationBlock.class, name = "illustration"),
        @JsonSubTypes.Type(value = ChapterBlockDto.SeparatorBlock.class, name = "separator")
})
public sealed interface ChapterBlockDto permits ChapterBlockDto.TextBlock, ChapterBlockDto.IllustrationBlock, ChapterBlockDto.SeparatorBlock {

    /** Versão do formato de blocos. Incrementar em mudanças breaking. */
    int CURRENT_VERSION = 1;

    /** Limite de ilustrações por capítulo (abertura não conta; é apresentação da obra). */
    int MAX_ILLUSTRATIONS_PER_CHAPTER = 6;

    /** Obtém o tipo discriminador do bloco. */
    String type();

    /**
     * Bloco de texto em prosa.
     * O conteúdo vem já sanitizado (sem HTML) do frontend; o backend re-sanitiza e normaliza.
     */
    public record TextBlock(@NotNull @JsonProperty("type") String type,
                     @NotNull @Valid @JsonProperty("content") TextContent content) implements ChapterBlockDto {

        @JsonCreator
        public TextBlock {
            if (!"text".equals(type)) throw new IllegalArgumentException("Tipo de bloco inválido: " + type);
        }

        public record TextContent(@NotBlank @Size(max = 30_000, message = "Bloco de texto excede 30.000 caracteres") String text) {}
    }

    /**
     * Bloco de ilustração intercalada no capítulo.
     * Referencia arquivo já enviado ao storage (UUID do chapter_file).
     */
    public record IllustrationBlock(@NotNull @JsonProperty("type") String type,
                             @NotNull @Valid @JsonProperty("content") IllustrationContent content) implements ChapterBlockDto {

        @JsonCreator
        public IllustrationBlock {
            if (!"illustration".equals(type)) throw new IllegalArgumentException("Tipo de bloco inválido: " + type);
        }

        public record IllustrationContent(@NotBlank @JsonProperty("fileId") String fileId,
                                   @JsonProperty("altText") String altText,
                                   @Min(1) @Max(100) @JsonProperty("width") Integer width,
                                   @Min(1) @Max(100) @JsonProperty("height") Integer height) {}
    }

    /**
     * Bloco separador visual (quebra de cena, passagem de tempo, etc.).
     * Não conta para contagem de caracteres nem limite de ilustrações.
     */
    public record SeparatorBlock(@NotNull @JsonProperty("type") String type,
                          @JsonProperty("content") SeparatorContent content) implements ChapterBlockDto {

        @JsonCreator
        public SeparatorBlock {
            if (!"separator".equals(type)) throw new IllegalArgumentException("Tipo de bloco inválido: " + type);
        }

        public record SeparatorContent(@JsonProperty("style") String style) {}
    }

    /**
     * Container da estrutura completa de blocos de um capítulo.
     * Versão 1: lista ordenada de blocos, máximo 6 ilustrações, contagem de caracteres visíveis por bloco de texto.
     */
    public record ChapterBlocksDto(@Min(1) @Max(CURRENT_VERSION) @JsonProperty("version") int version,
                            @NotNull @Valid @JsonProperty("blocks") List<ChapterBlockDto> blocks) {}
}