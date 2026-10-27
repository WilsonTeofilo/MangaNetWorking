package com.manganetworking.integration;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.relational.ChapterFileEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterFileRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.storage.ChapterFileAccessGuard;
import com.manganetworking.service.storage.FileStorageService;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.ChapterApplicationService;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integração real (PostgreSQL + MongoDB efêmeros) da relação {@code chapter_files} criada na migração V4.
 *
 * <p>Fecha o que os testes unitários não alcançam: o mapeamento JPA da tabela nova (nomes de tabela e
 * colunas têm de bater com o DDL), a escrita das linhas por
 * {@link WorkApplicationService#createChapter} e a leitura pelo
 * {@link ChapterFileAccessGuard} — tudo contra o Postgres de verdade, com o índice único ativo.</p>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
class ChapterFileAccessIntegrationTest {

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
    private WorkApplicationService workApplicationService;

    @Autowired
    private ChapterApplicationService chapterApplicationService;

    @Autowired
    private ChapterFileAccessGuard guard;

    @Autowired
    private ChapterFileRepository chapterFileRepository;

    @Autowired
    private WorkRepository workRepository;

    @Autowired
    private CreatorRepository creatorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @LocalServerPort
    private int port;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Página publicada: URL vira linha indexada em chapter_files e o guard libera o arquivo para anônimo")
    void registersChapterFileAndAllowsPublicAccess() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        chapterApplicationService.createChapter(creator.getId(), work.getId(), new CreateChapterRequestDto(
                1, "Capítulo 1", null,
                List.of("/api/storage/pagina-1.png", "/api/storage/pagina-2.png"),
                LocalDateTime.now().minusDays(1)));

        // A URL gravada em pages_json foi reduzida ao nome do arquivo que chega na rota do storage.
        ChapterFileEntity first = chapterFileRepository.findByFilename("pagina-1.png").orElseThrow();
        assertThat(first.getChapterId()).isNotNull();
        assertThat(first.getPosition()).isZero();
        assertThat(chapterFileRepository.findByFilename("pagina-2.png").orElseThrow().getPosition()).isEqualTo(1);
        // A URL completa não é a chave da relação.
        assertThat(chapterFileRepository.findByFilename("/api/storage/pagina-1.png")).isEmpty();

        ChapterFileAccessGuard.AccessDecision decision = guard.evaluate("pagina-1.png");
        assertThat(decision.allowed()).isTrue();
        // Página de capítulo nunca é cacheável por CDN/proxy compartilhado, mesmo liberada.
        assertThat(decision.privateContent()).isTrue();

        // Capa/avatar não têm linha na relação: seguem públicos e cacheáveis.
        ChapterFileAccessGuard.AccessDecision coverDecision = guard.evaluate("capa-do-autor.jpg");
        assertThat(coverDecision.allowed()).isTrue();
        assertThat(coverDecision.privateContent()).isFalse();
    }

    @Test
    @DisplayName("Capítulo em early access: guard nega a página para anônimo mesmo com a linha registrada")
    void deniesEarlyAccessPageForAnonymous() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        chapterApplicationService.createChapter(creator.getId(), work.getId(), new CreateChapterRequestDto(
                1, "Capítulo 1", null,
                List.of("/api/storage/antecipada-1.png"),
                LocalDateTime.now().plusDays(2)));

        assertThat(chapterFileRepository.findByFilename("antecipada-1.png")).isPresent();
        assertThat(guard.canRead("antecipada-1.png")).isFalse();
    }

    @Test
    @DisplayName("Carga do leitor: 100 GETs concorrentes servem bytes reais de imagem sem 404/429")
    void servesRealImagePageUnderConcurrentReaderLoad() throws Exception {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());
        byte[] realImage = Files.readAllBytes(Path.of("../frontend/public/assets/kokuin/shito.jpg"));
        String filename = fileStorageService.storeFile(realImage, "shito.jpg", "image/jpeg");

        chapterApplicationService.createChapter(creator.getId(), work.getId(), new CreateChapterRequestDto(
                1, "Página de carga", null,
                List.of("/api/storage/" + filename),
                LocalDateTime.now().minusDays(1)));

        HttpClient client = HttpClient.newHttpClient();
        var executor = Executors.newFixedThreadPool(10);
        try {
            record TimedResponse(HttpResponse<byte[]> response, long elapsedNanos) {}
            long started = System.nanoTime();
            var requests = java.util.stream.IntStream.range(0, 100)
                    .mapToObj(index -> java.util.concurrent.CompletableFuture.supplyAsync(() -> {
                        try {
                            long requestStarted = System.nanoTime();
                            HttpRequest request = HttpRequest.newBuilder()
                                    .uri(URI.create("http://localhost:" + port + "/api/storage/" + filename))
                                    .GET().build();
                            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
                            return new TimedResponse(response, System.nanoTime() - requestStarted);
                        } catch (Exception exception) {
                            throw new java.util.concurrent.CompletionException(exception);
                        }
                    }, executor)).toList();

            var timedResponses = requests.stream().map(java.util.concurrent.CompletableFuture::join).toList();
            var responses = timedResponses.stream().map(TimedResponse::response).toList();
            long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            long[] latenciesMs = timedResponses.stream().mapToLong(result -> TimeUnit.NANOSECONDS.toMillis(result.elapsedNanos())).sorted().toArray();
            assertThat(responses).hasSize(100).allSatisfy(response -> {
                assertThat(response.statusCode()).isEqualTo(200);
                assertThat(response.headers().firstValue("content-type").orElse("")).startsWith("image/jpeg");
                assertThat(response.body()).isEqualTo(realImage);
            });
            System.out.printf("Reader load evidence: requests=100, concurrency=10, status=200:100, elapsedMs=%d, p50Ms=%d, p95Ms=%d, maxMs=%d, payloadBytes=%d%n",
                    elapsedMs, latenciesMs[49], latenciesMs[94], latenciesMs[99], realImage.length);
        } finally {
            executor.shutdownNow();
            fileStorageService.deleteFile(filename);
        }
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

    private WorkEntity newWork(UUID creatorId) {
        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                "Obra " + UUID.randomUUID().toString().substring(0, 6),
                null,
                "Sinopse de teste de integração",
                "https://cdn.exemplo/capa.png",
                null,
                List.of(Genre.ACAO),
                true
        );
        WorkDetailsResponseDto created = workApplicationService.createWork(creatorId, dto);
        return workRepository.findById(created.id()).orElseThrow();
    }
}
