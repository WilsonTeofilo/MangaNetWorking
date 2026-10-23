package com.manganetworking.service.work;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.service.work.dto.ChapterBlockDto;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ChapterBlocksPolicyTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private String container(ChapterBlockDto... blocks) {
        try {
            return MAPPER.writeValueAsString(new ChapterBlockDto.ChapterBlocksDto(1, List.of(blocks)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @DisplayName("Valida capítulo com blocos de texto e ilustração dentro dos limites")
    void validChapterWithTextAndIllustration() {
        String text = "x".repeat(6_000);
        ChapterBlockDto.TextBlock tb = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));
        ChapterBlockDto.IllustrationBlock ib = new ChapterBlockDto.IllustrationBlock("illustration",
                new ChapterBlockDto.IllustrationBlock.IllustrationContent("file-1", "Alt", 50, 50));

        String json = container(tb, ib);
        assertDoesNotThrow(() -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertEquals(6_000, ChapterBlocksPolicy.totalVisibleCharacters(json));
    }

    @Test
    @DisplayName("Rejeita capítulo sem blocos de texto")
    void rejectsChapterWithoutTextBlock() {
        ChapterBlockDto.IllustrationBlock ib = new ChapterBlockDto.IllustrationBlock("illustration",
                new ChapterBlockDto.IllustrationBlock.IllustrationContent("file-1", "Alt", 50, 50));

        String json = container(ib);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertTrue(ex.getMessage().contains("pelo menos um bloco de texto"));
    }

    @Test
    @DisplayName("Rejeita capítulo com total abaixo de 1.000 caracteres")
    void rejectsChapterBelowMinimum() {
        String text = "x".repeat(999);
        ChapterBlockDto.TextBlock tb = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));

        String json = container(tb);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertTrue(ex.getMessage().contains("pelo menos 1000"));
    }

    @Test
    @DisplayName("Rejeita capítulo com total acima de 30.000 caracteres")
    void rejectsChapterAboveMaximum() {
        String text = "x".repeat(30_001);
        ChapterBlockDto.TextBlock tb = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));

        String json = container(tb);
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter(json));
        // Mensagem de bloco individual: "Bloco de texto #1 excede 30.000 caracteres visíveis."
        assertTrue(ex.getMessage().contains("30.000"));
    }

    @Test
    @DisplayName("Rejeita mais de 6 ilustrações intercaladas")
    void rejectsTooManyIllustrations() {
        var blocks = new ArrayList<ChapterBlockDto>();
        blocks.add(new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent("x".repeat(6_000))));
        for (int i = 0; i < 7; i++) {
            blocks.add(new ChapterBlockDto.IllustrationBlock("illustration",
                    new ChapterBlockDto.IllustrationBlock.IllustrationContent("file-" + i, "Alt", 50, 50)));
        }

        String json;
        try {
            json = MAPPER.writeValueAsString(new ChapterBlockDto.ChapterBlocksDto(1, blocks));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertTrue(ex.getMessage().contains("limite de 6 ilustrações"));
    }

    @Test
    @DisplayName("Aceita exatamente 6 ilustrações")
    void acceptsSixIllustrations() {
        var blocks = new ArrayList<ChapterBlockDto>();
        blocks.add(new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent("x".repeat(6_000))));
        for (int i = 0; i < 6; i++) {
            blocks.add(new ChapterBlockDto.IllustrationBlock("illustration",
                    new ChapterBlockDto.IllustrationBlock.IllustrationContent("file-" + i, "Alt", 50, 50)));
        }

        String json;
        try {
            json = MAPPER.writeValueAsString(new ChapterBlockDto.ChapterBlocksDto(1, blocks));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        assertDoesNotThrow(() -> ChapterBlocksPolicy.validateRegularChapter(json));
    }

    @Test
    @DisplayName("Separadores não contam para limites e vão para texto plano")
    void separatorsNotCountedInLimits() {
        String text = "x".repeat(6_000);
        ChapterBlockDto.TextBlock tb1 = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));
        ChapterBlockDto.SeparatorBlock sep = new ChapterBlockDto.SeparatorBlock("separator",
                new ChapterBlockDto.SeparatorBlock.SeparatorContent("scene"));
        ChapterBlockDto.TextBlock tb2 = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));

        String json = container(tb1, sep, tb2);
        assertDoesNotThrow(() -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertEquals(12_000, ChapterBlocksPolicy.totalVisibleCharacters(json));

        String plain = ChapterBlocksPolicy.blocksToPlainText(json);
        assertTrue(plain.contains("---\n\n"));
    }

    @Test
    @DisplayName("Detecta capítulo curto (aviso, não bloqueia)")
    void shortChapterWarning() {
        String text = "x".repeat(2_999);
        ChapterBlockDto.TextBlock tb = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));
        String json = container(tb);

        assertTrue(ChapterBlocksPolicy.isShortChapter(json));
        assertDoesNotThrow(() -> ChapterBlocksPolicy.validateRegularChapter(json));
    }

    @Test
    @DisplayName("Rejeita versão de bloco não suportada")
    void rejectsUnsupportedVersion() {
        String text = "x".repeat(6_000);
        ChapterBlockDto.TextBlock tb = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));

        String json;
        try {
            json = MAPPER.writeValueAsString(new ChapterBlockDto.ChapterBlocksDto(99, List.of(tb)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertTrue(ex.getMessage().contains("Versão de blocos não suportada"));
    }

    @Test
    @DisplayName("Rejeita JSON inválido/malformado")
    void rejectsInvalidJson() {
        assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter("{invalid}"));
    }

    @Test
    @DisplayName("Rejeita bloco de texto individual acima de 30.000")
    void rejectsSingleBlockTooLong() {
        String text = "x".repeat(30_001);
        ChapterBlockDto.TextBlock tb = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(text));
        String json = container(tb);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> ChapterBlocksPolicy.validateRegularChapter(json));
        assertTrue(ex.getMessage().contains("Bloco de texto #1 excede"));
    }

    @Test
    @DisplayName("Migra texto simples legado para blocos v1")
    void migratesPlainTextToBlocks() {
        String legacy = "<b>Capítulo 1</b>\n\n" + "x".repeat(1_000);
        String blocksJson = ChapterBlocksPolicy.migratePlainTextToBlocks(legacy);

        assertDoesNotThrow(() -> ChapterBlocksPolicy.validateRegularChapter(blocksJson));
        String plain = ChapterBlocksPolicy.blocksToPlainText(blocksJson);
        assertTrue(plain.contains("Capítulo 1"));
        assertTrue(plain.contains("x"));
    }
}