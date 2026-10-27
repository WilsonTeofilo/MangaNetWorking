package com.manganetworking.integration;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.enums.WorkFormat;
import com.manganetworking.domain.enums.WorkStatus;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.catalog.CatalogQueryService;
import com.manganetworking.service.catalog.dto.CatalogPageResponseDto;
import com.manganetworking.service.catalog.dto.CatalogReleaseResponseDto;
import com.manganetworking.service.catalog.dto.CatalogWorkResponseDto;
import com.manganetworking.service.moderation.ModerationApplicationService;
import com.manganetworking.service.work.ChapterApplicationService;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integração real (PostgreSQL + MongoDB efêmeros) do catálogo com o formato como primeiro eixo.
 *
 * <p>Cobre as regras que não podem ser só de UI: filtro por formato no servidor, valor inválido caindo
 * em "tudo", contadores por formato, ordenação, privacidade de obra suspensa e timeline de lançamentos
 * que não vaza capítulo agendado.</p>
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class CatalogIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container
    static final MongoDBContainer MONGO = new MongoDBContainer("mongo:7.0");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.mongodb.uri", MONGO::getReplicaSetUrl);
    }

    @Autowired
    private CatalogQueryService catalogQueryService;

    @Autowired
    private WorkApplicationService workApplicationService;

    @Autowired
    private ChapterApplicationService chapterApplicationService;

    @Autowired
    private ModerationApplicationService moderationApplicationService;

    @Autowired
    private WorkRepository workRepository;

    @Autowired
    private CreatorRepository creatorRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    @DisplayName("Formato filtra no servidor e os contadores por formato continuam corretos")
    void search_filtersByFormatAndKeepsCounters() {
        CreatorEntity creator = newCreator();
        String token = token();

        newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.ACAO), "Alfa " + token);
        newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.ACAO), "Beta " + token);
        newWork(creator.getId(), WorkFormat.LIGHT_NOVEL, List.of(Genre.ACAO), "Gama " + token);

        CatalogPageResponseDto manga = catalogQueryService.search(
                "manga", null, null, null, token, "relevance", false, 0, 24);

        assertThat(manga.items()).hasSize(2)
                .allSatisfy(item -> assertThat(item.format()).isEqualTo(WorkFormat.MANGA));
        assertThat(manga.totalAll()).isEqualTo(3);
        assertThat(manga.totalManga()).isEqualTo(2);
        assertThat(manga.totalLightNovel()).isEqualTo(1);

        CatalogPageResponseDto novels = catalogQueryService.search(
                "light-novel", null, null, null, token, "relevance", false, 0, 24);

        assertThat(novels.items()).hasSize(1);
        assertThat(novels.items().get(0).format()).isEqualTo(WorkFormat.LIGHT_NOVEL);
    }

    @Test
    @DisplayName("Formato inválido cai em \"tudo\" em vez de esconder obras")
    void search_invalidFormatFallsBackToAll() {
        CreatorEntity creator = newCreator();
        String token = token();
        newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.ACAO), "Alfa " + token);
        newWork(creator.getId(), WorkFormat.LIGHT_NOVEL, List.of(Genre.ACAO), "Gama " + token);

        CatalogPageResponseDto result = catalogQueryService.search(
                "formato-invalido", null, null, null, token, "relevance", false, 0, 24);

        assertThat(result.total()).isEqualTo(2);
        assertThat(result.items()).extracting(CatalogWorkResponseDto::format)
                .containsExactlyInAnyOrder(WorkFormat.MANGA, WorkFormat.LIGHT_NOVEL);
    }

    @Test
    @DisplayName("Gênero, status, ordenação e paginação combinam no backend")
    void search_combinesGenreStatusSortAndPagination() {
        CreatorEntity creator = newCreator();
        String token = token();

        WorkEntity fantasiaA = newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.FANTASIA, Genre.SHONEN), "A " + token);
        newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.FANTASIA), "B " + token);
        newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.DRAMA), "C " + token);

        CatalogPageResponseDto firstPage = catalogQueryService.search(
                "manga", List.of("fantasia"), "ongoing", null, token, "title", false, 0, 1);

        assertThat(firstPage.total()).isEqualTo(2);
        assertThat(firstPage.items()).hasSize(1);
        assertThat(firstPage.items().get(0).title()).isEqualTo("A " + token);
        assertThat(firstPage.totalPages()).isEqualTo(2);

        CatalogPageResponseDto audience = catalogQueryService.search(
                "manga", null, null, "shonen", token, "relevance", false, 0, 24);

        assertThat(audience.total()).isEqualTo(1);
        assertThat(audience.items().get(0).id()).isEqualTo(fantasiaA.getId());
    }

    @Test
    @DisplayName("Busca por gênero digitado encontra a obra mesmo sem o nome no título")
    void search_freeTextAlsoMatchesGenreLabel() {
        CreatorEntity creator = newCreator();
        String token = token();
        WorkEntity work = newWork(creator.getId(), WorkFormat.LIGHT_NOVEL, List.of(Genre.SCI_FI), "Robô " + token);

        CatalogPageResponseDto result = catalogQueryService.search(
                null, null, null, null, "Ficção científica", "relevance", false, 0, 24);

        assertThat(result.items()).extracting(CatalogWorkResponseDto::id).contains(work.getId());
    }

    @Test
    @DisplayName("Obra suspensa não aparece no catálogo")
    void search_hidesSuspendedWork() {
        CreatorEntity creator = newCreator();
        String token = token();
        WorkEntity work = newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.ACAO), "Oculta " + token);

        moderationApplicationService.suspendWork(work.getId(), "Teste de catálogo");

        CatalogPageResponseDto result = catalogQueryService.search(
                null, null, null, null, token, "relevance", false, 0, 24);

        assertThat(result.items()).isEmpty();
    }

    @Test
    @DisplayName("Filtro \"com ilustrações\" só considera light novel com apresentação")
    void search_presentationFilterOnlyAppliesToLightNovel() {
        CreatorEntity creator = newCreator();
        String token = token();

        WorkEntity novel = newWork(creator.getId(), WorkFormat.LIGHT_NOVEL, List.of(Genre.ACAO), "Ilustrada " + token);
        newWork(creator.getId(), WorkFormat.LIGHT_NOVEL, List.of(Genre.ACAO), "Sem arte " + token);

        WorkEntity toUpdate = workRepository.findById(novel.getId()).orElseThrow();
        toUpdate.setPresentationJson("{\"version\":1,\"images\":[\"capa.png\"]}");
        workRepository.save(toUpdate);

        CatalogPageResponseDto result = catalogQueryService.search(
                "light-novel", null, null, null, token, "relevance", true, 0, 24);

        assertThat(result.items()).extracting(CatalogWorkResponseDto::id).containsExactly(novel.getId());
    }

    @Test
    @DisplayName("Lançamentos só trazem capítulo já público, mais recente primeiro")
    void releases_onlyIncludePublicChapters() {
        CreatorEntity creator = newCreator();

        WorkEntity work = newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.ACAO), "Lançamento " + token());
        String fileToken = token();
        LocalDateTime past = LocalDateTime.now().minusDays(1);
        LocalDateTime future = LocalDateTime.now().plusDays(3);

        chapterApplicationService.createChapter(creator.getId(), work.getId(),
                new CreateChapterRequestDto(1, "Capítulo público", null, List.of(fileToken + "-p1.png"), past));
        chapterApplicationService.createChapter(creator.getId(), work.getId(),
                new CreateChapterRequestDto(2, "Capítulo agendado", null, List.of(fileToken + "-p2.png"), future));

        List<CatalogReleaseResponseDto> releases = catalogQueryService.releases("manga", 60);
        List<CatalogReleaseResponseDto> fromWork = releases.stream()
                .filter(release -> release.workId().equals(work.getId()))
                .toList();

        assertThat(fromWork).hasSize(1);
        assertThat(fromWork.get(0).chapterNumber()).isEqualTo(1);
        assertThat(fromWork.get(0).format()).isEqualTo(WorkFormat.MANGA);
    }

    @Test
    @DisplayName("Obra em rascunho não aparece no catálogo nem nos lançamentos")
    void search_hidesDraftWork() {
        CreatorEntity creator = newCreator();
        String token = token();
        WorkEntity work = newWork(creator.getId(), WorkFormat.MANGA, List.of(Genre.ACAO), "Rascunho " + token);

        chapterApplicationService.createChapter(creator.getId(), work.getId(),
                new CreateChapterRequestDto(1, "Capítulo em rascunho", null, List.of(token + "-p1.png"),
                        LocalDateTime.now().minusDays(2)));

        WorkEntity draft = workRepository.findById(work.getId()).orElseThrow();
        draft.setStatus(WorkStatus.DRAFT);
        workRepository.save(draft);

        CatalogPageResponseDto result = catalogQueryService.search(
                null, null, null, null, token, "relevance", false, 0, 24);

        assertThat(result.items()).isEmpty();
        assertThat(catalogQueryService.releases(null, 60))
                .noneMatch(release -> release.workId().equals(work.getId()));
    }

    /* ------------------------------------------------------------------ */

    private String token() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    private CreatorEntity newCreator() {
        String handle = "autor" + UUID.randomUUID().toString().substring(0, 10);

        UserEntity user = new UserEntity();
        user.setEmail(handle + "@exemplo.test");
        user.setUsername(handle);
        user.setName("Autor de Integração");
        user.setCreator(true);
        user.setPasswordHash("$2a$12$testeDeIntegracaoSemLogin");
        UserEntity savedUser = userRepository.save(user);

        CreatorEntity creator = new CreatorEntity();
        creator.setUser(savedUser);
        creator.setHandle(handle);
        creator.setDocumentCpf("12345678900");
        creator.setPixKey("chave-pix-" + handle);
        creator.setPixKeyType(PixKeyType.CPF);
        return creatorRepository.save(creator);
    }

    private WorkEntity newWork(UUID creatorId, WorkFormat format, List<Genre> genres, String title) {
        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                title,
                null,
                "Sinopse de teste de integração do catálogo com formato como primeiro eixo.",
                "https://cdn.exemplo/capa.png",
                null,
                genres,
                true,
                format
        );
        WorkDetailsResponseDto created = workApplicationService.createWork(creatorId, dto);
        return workRepository.findById(created.id()).orElseThrow();
    }
}
