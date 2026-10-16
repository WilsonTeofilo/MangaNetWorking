package com.manganetworking.integration;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.PixKeyType;
import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cobertura de integração real (PostgreSQL + MongoDB efêmeros) para os pontos que o smoke E2E validava
 * manualmente e que os testes de slice não alcançam:
 *
 * <ul>
 *   <li>{@code spring.jpa.open-in-view=false}: o cenário roda com OSIV desligado (o próprio contexto).</li>
 *   <li>Sincronização do feed (MongoDB) adiada para {@code afterCommit}: cadastrar obra / publicar capítulo
 *       grava o documento no Mongo <b>depois</b> do commit relacional, sem {@code LazyInitializationException}.</li>
 *   <li>Reindexação do catálogo ({@code syncAllWorksToFeed}) chamada fora de requisição web — depende do
 *       {@code @Transactional(readOnly = true)} do serviço.</li>
 * </ul>
 *
 * <p>As classes usam {@code disabledWithoutDocker = true}: sem daemon Docker o teste é ignorado, então a
 * suíte continua verde em ambientes sem contêiner.</p>
 */
@SpringBootTest
@Testcontainers(disabledWithoutDocker = true)
class FeedSyncIntegrationTest {

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
    private RecommendationAlgorithmService algorithmService;

    @Autowired
    private WorkRepository workRepository;

    @Autowired
    private CreatorRepository creatorRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkFeedMongoRepository workFeedMongoRepository;

    @Value("${spring.jpa.open-in-view:true}")
    private boolean openInView;

    @Test
    void createWork_persistsInPostgresAndSyncsFeedInMongoAfterCommit_withoutOsiv() {
        // Garante que o cenário realmente roda com o OSIV desligado (é a premissa do teste).
        assertThat(openInView).isFalse();

        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        // Passado o commit relacional, a obra existe no PostgreSQL...
        assertThat(workRepository.findById(work.getId())).isPresent();

        // ...e o feed (MongoDB) foi sincronizado no afterCommit, sem LazyInitializationException.
        Optional<WorkFeedDocument> feed = workFeedMongoRepository.findByWorkId(work.getId().toString());
        assertThat(feed).isPresent();
        assertThat(feed.get().getSlug()).isEqualTo(work.getSlug());
        assertThat(feed.get().getTitle()).isEqualTo(work.getTitle());
        assertThat(feed.get().getAuthorHandle()).isEqualTo("@" + creator.getHandle());
        assertThat(feed.get().getAuthorId()).isEqualTo(creator.getId().toString());
        assertThat(feed.get().getGenres()).containsExactly(Genre.ACAO.name());
    }

    @Test
    void createChapter_updatesFeedWithLatestChapterAndEarlyAccessAfterCommit() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        LocalDateTime releaseAt = LocalDateTime.now().plusDays(2);
        workApplicationService.createChapter(creator.getId(), work.getId(),
                new CreateChapterRequestDto(1, "Capítulo 1", null, List.of("p1.png", "p2.png"), releaseAt));

        WorkFeedDocument feed = workFeedMongoRepository.findByWorkId(work.getId().toString()).orElseThrow();
        assertThat(feed.getTotalChapters()).isEqualTo(1);
        assertThat(feed.getLatestChapterNumber()).isEqualTo(1);
        assertThat(feed.getLatestChapterTitle()).isEqualTo("Capítulo 1");
        // Liberação futura => acesso antecipado para membros, refletido no documento do feed.
        assertThat(feed.isLatestChapterIsEarlyAccess()).isTrue();
    }

    @Test
    void syncAllWorksToFeed_reindexesWithoutLazyInitializationException_withOsivOff() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        // Chamada fora de requisição web (como o job agendado): sem OSIV, a associação LAZY do autor só
        // é acessível porque syncAllWorksToFeed é @Transactional(readOnly = true).
        int total = algorithmService.syncAllWorksToFeed();

        assertThat(total).isGreaterThanOrEqualTo(1);
        assertThat(workFeedMongoRepository.findByWorkId(work.getId().toString())).isPresent();
    }

    private CreatorEntity newCreator() {
        String handle = "autor" + UUID.randomUUID().toString().substring(0, 10);

        UserEntity user = new UserEntity();
        user.setEmail(handle + "@exemplo.test");
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
        return workApplicationService.createWork(creatorId, dto);
    }
}
