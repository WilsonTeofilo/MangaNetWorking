package com.manganetworking.service.feed.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.domain.nosql.WorkFeedDocument;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Trava o contrato JSON do feed.
 *
 * <p>A API passou a devolver {@link FeedWorkResponseDto} em vez do documento Mongo. Estes testes provam que
 * a serialização continua <b>idêntica</b> à do {@link WorkFeedDocument} (mesmos nomes e valores de campo),
 * ou seja, a troca de camada não altera o que o frontend recebe.</p>
 */
class FeedWorkResponseDtoTest {

    private final ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();

    @Test
    @DisplayName("DTO do feed serializa exatamente o mesmo JSON do WorkFeedDocument (contrato preservado)")
    void keepsJsonContractWithAllFieldsPopulated() throws Exception {
        WorkFeedDocument doc = new WorkFeedDocument();
        doc.setId("doc-1");
        doc.setWorkId("work-1");
        doc.setTitle("Obra de Teste");
        doc.setSlug("obra-de-teste");
        doc.setOriginalTitle("Original");
        doc.setSynopsis("Sinopse");
        doc.setCoverUrl("/uploads/cover.png");
        doc.setBannerUrl("/uploads/banner.png");
        doc.setAuthorId("author-1");
        doc.setAuthorName("Autor");
        doc.setAuthorHandle("@autor");
        doc.setAuthorAvatarUrl("/uploads/avatar.png");
        doc.setGenres(List.of("ACAO", "FANTASIA"));
        doc.setStatus("ongoing");
        doc.setTotalViews(42L);
        doc.setTotalLikes(7L);
        doc.setTotalComments(3L);
        doc.setTotalChapters(5);
        doc.setLatestChapterNumber(5);
        doc.setLatestChapterTitle("Capítulo 5");
        doc.setLatestChapterReleaseAt(Instant.parse("2026-10-16T12:00:00Z"));
        doc.setLatestChapterIsEarlyAccess(true);
        doc.setDiscoveryScore(12.5);
        doc.setTrendingScore(30.25);
        doc.setFreshRelease(true);
        doc.setCreatorBoostMul(1.5);
        doc.setUpdatedAt(Instant.parse("2026-10-16T12:30:00Z"));

        String documentJson = mapper.writeValueAsString(doc);
        String dtoJson = mapper.writeValueAsString(FeedWorkResponseDto.from(doc));

        assertEquals(mapper.readTree(documentJson), mapper.readTree(dtoJson),
                "O DTO não pode alterar nomes, valores ou presença de campos do contrato JSON do feed");
    }

    @Test
    @DisplayName("DTO do feed preserva o contrato também em documento recém-materializado (campos vazios)")
    void keepsJsonContractWithDefaults() throws Exception {
        WorkFeedDocument doc = new WorkFeedDocument();
        doc.setWorkId("work-2");

        assertEquals(
                mapper.readTree(mapper.writeValueAsString(doc)),
                mapper.readTree(mapper.writeValueAsString(FeedWorkResponseDto.from(doc))));
    }
}
