package com.manganetworking.service.user.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.domain.nosql.ReadingProgressDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Trava o contrato JSON do histórico de leitura e da exportação LGPD.
 *
 * <p>Os endpoints passaram a devolver {@link ReadingProgressResponseDto} em vez do documento Mongo; a
 * serialização precisa continuar idêntica à do {@link ReadingProgressDocument}.</p>
 */
class ReadingProgressResponseDtoTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @DisplayName("DTO do histórico serializa exatamente o mesmo JSON do ReadingProgressDocument")
    void keepsJsonContractWithAllFieldsPopulated() throws Exception {
        ReadingProgressDocument doc = new ReadingProgressDocument();
        doc.setId("progress-1");
        doc.setUserId("user-1");
        doc.setWorkId("work-1");
        doc.setWorkTitle("Obra de Teste");
        doc.setWorkCoverUrl("/uploads/cover.png");
        doc.setChapterId("chapter-1");
        doc.setChapterNumber(3);
        doc.setChapterTitle("Capítulo 3");
        doc.setPage(12);
        doc.setTotalPages(20);
        doc.setCumulativePagesRead(57);
        doc.setUpdatedAt(Instant.parse("2026-10-16T12:00:00Z"));

        String documentJson = mapper.writeValueAsString(doc);
        String dtoJson = mapper.writeValueAsString(ReadingProgressResponseDto.from(doc));

        assertEquals(mapper.readTree(documentJson), mapper.readTree(dtoJson),
                "O DTO não pode alterar nomes, valores ou presença de campos do contrato JSON do histórico");
    }
}
