package com.manganetworking.service.work;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.domain.enums.ChapterType;
import com.manganetworking.service.work.dto.ChapterBlockDto;
import com.manganetworking.util.SanitizationUtils;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Política editorial para capítulos de light novel em formato de blocos (versão 1+).
 * Valida estrutura, contagem de caracteres visíveis, limite de ilustrações e consistência.
 */
public final class ChapterBlocksPolicy {

    public static final int MAX_ILLUSTRATIONS_PER_CHAPTER = 6;
    public static final int MIN_VISIBLE_CHARACTERS_TOTAL = 1_000;
    public static final int MAX_VISIBLE_CHARACTERS_TOTAL = 30_000;
    public static final int SHORT_CHAPTER_WARNING_THRESHOLD = 3_000;
    public static final int RECOMMENDED_MIN_CHARACTERS = 6_000;
    public static final int RECOMMENDED_MAX_CHARACTERS = 18_000;
    /** Mínimo para prólogo e conteúdo especial. */
    public static final int SPECIAL_MIN_VISIBLE_CHARACTERS = 300;
    /** Limite defensivo aplicado ao JSON bruto antes do parse. */
    public static final int MAX_RAW_JSON_CHARS = 2_000_000;

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Pattern SCRIPT_TAG = Pattern.compile("<script.*?>.*?</script>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern HTML_TAG = Pattern.compile("<[^>]*>", Pattern.DOTALL);
    private static final Pattern JAVASCRIPT_SCHEME = Pattern.compile("(?i)javascript:");

    private ChapterBlocksPolicy() {}

    /**
     * Valida a estrutura completa de blocos de um capítulo regular.
     * Lança IllegalArgumentException com mensagem clara se inválido.
     */
    public static void validateRegularChapter(String blocksJson) {
        if (blocksJson == null || blocksJson.isBlank()) {
            throw new IllegalArgumentException("Capítulo em blocos não pode ser vazio.");
        }
        if (blocksJson.length() > MAX_RAW_JSON_CHARS) {
            throw new IllegalArgumentException("O JSON de blocos excede o limite técnico de processamento.");
        }

        ChapterBlockDto.ChapterBlocksDto container;
        try {
            container = MAPPER.readValue(blocksJson, ChapterBlockDto.ChapterBlocksDto.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("JSON de blocos inválido: " + e.getMessage());
        }

        if (container.version() < 1 || container.version() > ChapterBlockDto.CURRENT_VERSION) {
            throw new IllegalArgumentException("Versão de blocos não suportada: " + container.version() + ". Atual: " + ChapterBlockDto.CURRENT_VERSION);
        }

        List<ChapterBlockDto> blocks = container.blocks();
        if (blocks == null || blocks.isEmpty()) {
            throw new IllegalArgumentException("Capítulo precisa ter pelo menos um bloco.");
        }

        int illustrationCount = 0;
        long totalVisibleChars = 0;
        boolean hasTextBlock = false;

        for (int i = 0; i < blocks.size(); i++) {
            ChapterBlockDto block = blocks.get(i);
            if (block instanceof ChapterBlockDto.TextBlock tb) {
                hasTextBlock = true;
                String normalized = normalizeBlockText(tb.content().text());
                int count = visibleCharacterCount(normalized);
                if (count > 30_000) {
                    throw new IllegalArgumentException("Bloco de texto #" + (i + 1) + " excede 30.000 caracteres visíveis.");
                }
                totalVisibleChars += count;
            } else if (block instanceof ChapterBlockDto.IllustrationBlock) {
                illustrationCount++;
                if (illustrationCount > MAX_ILLUSTRATIONS_PER_CHAPTER) {
                    throw new IllegalArgumentException("Capítulo excede o limite de " + MAX_ILLUSTRATIONS_PER_CHAPTER + " ilustrações intercaladas.");
                }
            } else if (block instanceof ChapterBlockDto.SeparatorBlock) {
                // separadores não contam para limites
            } else {
                throw new IllegalArgumentException("Tipo de bloco desconhecido na posição " + (i + 1) + ".");
            }
        }

        if (!hasTextBlock) {
            throw new IllegalArgumentException("Capítulo regular precisa ter pelo menos um bloco de texto.");
        }

        if (totalVisibleChars < MIN_VISIBLE_CHARACTERS_TOTAL) {
            throw new IllegalArgumentException("Capítulos regulares de light novel precisam ter pelo menos "
                    + MIN_VISIBLE_CHARACTERS_TOTAL + " caracteres visíveis no total (encontrados: " + totalVisibleChars + ").");
        }
        if (totalVisibleChars > MAX_VISIBLE_CHARACTERS_TOTAL) {
            throw new IllegalArgumentException("Capítulos regulares de light novel podem ter no máximo "
                    + MAX_VISIBLE_CHARACTERS_TOTAL + " caracteres visíveis no total (encontrados: " + totalVisibleChars + ").");
        }
    }

    /**
     * Valida capítulo do tipo PROLOGUE ou SPECIAL (mínimo 300 caracteres, máximo 30.000).
     * Não exige bloco de texto obrigatório (pode ter só ilustrações em SPECIAL).
     */
    public static void validateSpecialOrPrologueChapter(String blocksJson, ChapterType chapterType) {
        if (blocksJson == null || blocksJson.isBlank()) {
            throw new IllegalArgumentException("Capítulo em blocos não pode ser vazio.");
        }
        if (blocksJson.length() > MAX_RAW_JSON_CHARS) {
            throw new IllegalArgumentException("O JSON de blocos excede o limite técnico de processamento.");
        }

        ChapterBlockDto.ChapterBlocksDto container;
        try {
            container = MAPPER.readValue(blocksJson, ChapterBlockDto.ChapterBlocksDto.class);
        } catch (Exception e) {
            throw new IllegalArgumentException("JSON de blocos inválido: " + e.getMessage());
        }

        if (container.version() < 1 || container.version() > ChapterBlockDto.CURRENT_VERSION) {
            throw new IllegalArgumentException("Versão de blocos não suportada: " + container.version() + ". Atual: " + ChapterBlockDto.CURRENT_VERSION);
        }

        List<ChapterBlockDto> blocks = container.blocks();
        if (blocks == null || blocks.isEmpty()) {
            throw new IllegalArgumentException("Capítulo precisa ter pelo menos um bloco.");
        }

        int illustrationCount = 0;
        long totalVisibleChars = 0;
        boolean hasTextBlock = false;

        for (int i = 0; i < blocks.size(); i++) {
            ChapterBlockDto block = blocks.get(i);
            if (block instanceof ChapterBlockDto.TextBlock tb) {
                hasTextBlock = true;
                String normalized = normalizeBlockText(tb.content().text());
                int count = visibleCharacterCount(normalized);
                if (count > 30_000) {
                    throw new IllegalArgumentException("Bloco de texto #" + (i + 1) + " excede 30.000 caracteres visíveis.");
                }
                totalVisibleChars += count;
            } else if (block instanceof ChapterBlockDto.IllustrationBlock) {
                illustrationCount++;
                if (illustrationCount > MAX_ILLUSTRATIONS_PER_CHAPTER) {
                    throw new IllegalArgumentException("Capítulo excede o limite de " + MAX_ILLUSTRATIONS_PER_CHAPTER + " ilustrações intercaladas.");
                }
            } else if (block instanceof ChapterBlockDto.SeparatorBlock) {
                // separadores não contam para limites
            } else {
                throw new IllegalArgumentException("Tipo de bloco desconhecido na posição " + (i + 1) + ".");
            }
        }

        // Para SPECIAL, permite só ilustrações; para PROLOGUE, exige texto
        if (chapterType == ChapterType.PROLOGUE && !hasTextBlock) {
            throw new IllegalArgumentException("Prólogo precisa ter pelo menos um bloco de texto.");
        }

        if (totalVisibleChars < SPECIAL_MIN_VISIBLE_CHARACTERS) {
            throw new IllegalArgumentException(capitalize(chapterType.name().toLowerCase()) + " precisa ter pelo menos "
                    + SPECIAL_MIN_VISIBLE_CHARACTERS + " caracteres visíveis no total (encontrados: " + totalVisibleChars + ").");
        }
        if (totalVisibleChars > MAX_VISIBLE_CHARACTERS_TOTAL) {
            throw new IllegalArgumentException(capitalize(chapterType.name().toLowerCase()) + " pode ter no máximo "
                    + MAX_VISIBLE_CHARACTERS_TOTAL + " caracteres visíveis no total (encontrados: " + totalVisibleChars + ").");
        }
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    /** Verifica se o capítulo total é curto (aviso, não bloqueia). */
    public static boolean isShortChapter(String blocksJson) {
        try {
            ChapterBlockDto.ChapterBlocksDto container = MAPPER.readValue(blocksJson, ChapterBlockDto.ChapterBlocksDto.class);
            long total = 0;
            for (ChapterBlockDto block : container.blocks()) {
                if (block instanceof ChapterBlockDto.TextBlock tb) {
                    total += visibleCharacterCount(normalizeBlockText(tb.content().text()));
                }
            }
            return total < SHORT_CHAPTER_WARNING_THRESHOLD;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Converte blocos versão 1 para texto simples legível (fallback para leitores legados, busca, etc.).
     * Retorna texto plano com quebras duplas entre blocos.
     */
    public static String blocksToPlainText(String blocksJson) {
        if (blocksJson == null || blocksJson.isBlank()) return "";
        try {
            ChapterBlockDto.ChapterBlocksDto container = MAPPER.readValue(blocksJson, ChapterBlockDto.ChapterBlocksDto.class);
            StringBuilder sb = new StringBuilder();
            boolean first = true;
            for (ChapterBlockDto block : container.blocks()) {
                if (block instanceof ChapterBlockDto.TextBlock tb) {
                    if (!first) sb.append("\n\n");
                    sb.append(normalizeBlockText(tb.content().text()));
                    first = false;
                } else if (block instanceof ChapterBlockDto.SeparatorBlock) {
                    if (!first) sb.append("\n\n---\n\n");
                }
                // ilustrações não vão para texto plano
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /** Extrai o total de caracteres visíveis dos blocos de texto. */
    public static int totalVisibleCharacters(String blocksJson) {
        if (blocksJson == null || blocksJson.isBlank()) return 0;
        try {
            ChapterBlockDto.ChapterBlocksDto container = MAPPER.readValue(blocksJson, ChapterBlockDto.ChapterBlocksDto.class);
            int total = 0;
            for (ChapterBlockDto block : container.blocks()) {
                if (block instanceof ChapterBlockDto.TextBlock tb) {
                    total += visibleCharacterCount(normalizeBlockText(tb.content().text()));
                }
            }
            return total;
        } catch (Exception e) {
            return 0;
        }
    }

    /** Conta pontos de código Unicode. */
    public static int visibleCharacterCount(String normalizedPlainText) {
        return normalizedPlainText == null ? 0 : normalizedPlainText.codePointCount(0, normalizedPlainText.length());
    }

    /** Normaliza texto de bloco: remove HTML, normaliza NFC/quebras, strip. */
    private static String normalizeBlockText(String raw) {
        if (raw == null) return "";
        String withoutScripts = SCRIPT_TAG.matcher(raw).replaceAll("");
        String withoutMarkup = HTML_TAG.matcher(withoutScripts).replaceAll("");
        String sanitized = JAVASCRIPT_SCHEME.matcher(withoutMarkup).replaceAll("");
        return Normalizer.normalize(sanitized, Normalizer.Form.NFC)
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .strip();
    }

    /**
     * Migra texto simples legado (content_text) para estrutura de blocos v1.
     * Cria um único bloco de texto com o conteúdo normalizado.
     */
    public static String migratePlainTextToBlocks(String plainText) {
        String normalized = ProseEditorialPolicy.normalizePlainText(plainText);
        ChapterBlockDto.TextBlock block = new ChapterBlockDto.TextBlock("text",
                new ChapterBlockDto.TextBlock.TextContent(normalized));
        ChapterBlockDto.ChapterBlocksDto container = new ChapterBlockDto.ChapterBlocksDto(1, List.of(block));
        try {
            return MAPPER.writeValueAsString(container);
        } catch (Exception e) {
            throw new IllegalArgumentException("Falha ao migrar para blocos: " + e.getMessage());
        }
    }
}