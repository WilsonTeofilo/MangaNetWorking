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
import com.manganetworking.service.feed.FeedApplicationService;
import com.manganetworking.service.feed.dto.FeedWorkResponseDto;
import com.manganetworking.service.moderation.ModerationApplicationService;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.ChapterApplicationService;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import org.junit.jupiter.api.DisplayName;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cobertura de integração real (PostgreSQL + MongoDB efêmeros) para os pontos que o smoke E2E validava
 * manualmente e que os testes de slice/unitários não alcançam:
 *
 * <ul>
 *   <li>{@code spring.jpa.open-in-view=false}: o contexto roda com OSIV desligado (premissa verificada em teste).</li>
 *   <li>Sincronização do feed (MongoDB) adiada para {@code afterCommit}: cadastrar obra / publicar capítulo
 *       grava o documento no Mongo <b>depois</b> do commit relacional, sem {@code LazyInitializationException}.</li>
 *   <li>Reindexação do catálogo ({@code syncAllWorksToFeed}) chamada fora de requisição web — depende do
 *       {@code @Transactional(readOnly = true)} do serviço para resolver a associação LAZY do autor.</li>
 *   <li>Remoção do feed na suspensão por moderação (o outro caminho {@code afterCommit}).</li>
 * </ul>
 *
 * <p><b>Importante:</b> esta classe NÃO deve receber {@code @Transactional}. O teste depende de a transação
 * dos serviços <i>commitar</i> para disparar as sincronizações {@code afterCommit}; um {@code @Transactional}
 * de teste postergaria o commit e faria as asserções falharem (falso negativo).</p>
 *
 * <p>Usa {@code disabledWithoutDocker = true}: sem daemon Docker a classe é ignorada (aparece como
 * {@code Skipped} no surefire), então a suíte continua verde em ambientes sem contêiner.</p>
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
    private ChapterApplicationService chapterApplicationService;

    @Autowired
    private ModerationApplicationService moderationApplicationService;

    @Autowired
    private FeedApplicationService feedApplicationService;

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
    @DisplayName("Cadastro de obra: persiste no PostgreSQL e sincroniza o feed no MongoDB no afterCommit, sem OSIV")
    void createWork_persistsInPostgresAndSyncsFeedInMongoAfterCommit_withoutOsiv() {
        // Garante que o cenário realmente roda com o OSIV desligado (é a premissa do teste).
        assertThat(openInView).isFalse();

        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        // Passado o commit relacional, a obra existe no PostgreSQL...
        assertThat(workRepository.findById(work.getId())).isPresent();

        // ...e o feed (MongoDB) foi sincronizado no afterCommit, sem LazyInitializationException.
        WorkFeedDocument feed = workFeedMongoRepository.findByWorkId(work.getId().toString()).orElseThrow();
        assertThat(feed.getSlug()).isEqualTo(work.getSlug());
        assertThat(feed.getTitle()).isEqualTo(work.getTitle());
        assertThat(feed.getAuthorHandle()).isEqualTo("@" + creator.getHandle());
        assertThat(feed.getAuthorId()).isEqualTo(creator.getId().toString());
        assertThat(feed.getGenres()).containsExactly(Genre.ACAO.name());
    }

    @Test
    @DisplayName("Publicação de capítulo: feed atualizado no afterCommit com último capítulo e early access")
    void createChapter_updatesFeedWithLatestChapterAndEarlyAccessAfterCommit() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());

        LocalDateTime releaseAt = LocalDateTime.now().plusDays(2);
        chapterApplicationService.createChapter(creator.getId(), work.getId(),
                new CreateChapterRequestDto(1, "Capítulo 1", null, List.of("p1.png", "p2.png"), releaseAt));

        WorkFeedDocument feed = workFeedMongoRepository.findByWorkId(work.getId().toString()).orElseThrow();
        assertThat(feed.getTotalChapters()).isEqualTo(1);
        assertThat(feed.getLatestChapterNumber()).isEqualTo(1);
        assertThat(feed.getLatestChapterTitle()).isEqualTo("Capítulo 1");
        // Liberação futura => acesso antecipado para membros, refletido no documento do feed.
        assertThat(feed.isLatestChapterIsEarlyAccess()).isTrue();
    }

    @Test
    @DisplayName("Reindexação do catálogo fora de requisição web resolve o autor LAZY sem OSIV e recria o documento")
    void syncAllWorksToFeed_reindexesWithoutLazyInitializationException_withOsivOff() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());
        String workId = work.getId().toString();

        // Remove o documento criado no afterCommit do cadastro: só assim a reindexação tem o que recriar,
        // provando de fato que syncAllWorksToFeed materializa o documento (e não que ele já existia).
        workFeedMongoRepository.deleteByWorkId(workId);
        assertThat(workFeedMongoRepository.findByWorkId(workId)).isEmpty();

        int total = algorithmService.syncAllWorksToFeed();

        assertThat(total).isGreaterThanOrEqualTo(1);
        WorkFeedDocument feed = workFeedMongoRepository.findByWorkId(workId).orElseThrow();
        // O autor é uma associação LAZY: sem o @Transactional(readOnly = true) do serviço, esta leitura
        // teria lançado LazyInitializationException (OSIV desligado).
        assertThat(feed.getAuthorHandle()).isEqualTo("@" + creator.getHandle());
        assertThat(feed.getWorkId()).isEqualTo(workId);
    }

    @Test
    @DisplayName("Suspensão por moderação: obra é removida do feed no MongoDB no afterCommit")
    void suspendWork_removesWorkFromFeedAfterCommit() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());
        String workId = work.getId().toString();

        // A obra está no feed (sincronizada no cadastro)...
        assertThat(workFeedMongoRepository.findByWorkId(workId)).isPresent();

        moderationApplicationService.suspendWork(work.getId(), "Teste de integração");

        // ...e a suspensão remove o documento no afterCommit, além de marcar o status relacional.
        assertThat(workRepository.findById(work.getId()).orElseThrow().getStatus()).isEqualTo("suspended");
        assertThat(workFeedMongoRepository.findByWorkId(workId)).isEmpty();
    }

    @Test
    @DisplayName("Recálculo agendado não ressuscita obra suspensa no feed (invariante de moderação)")
    void syncAllWorksToFeed_doesNotResurrectSuspendedWork() {
        CreatorEntity creator = newCreator();
        WorkEntity work = newWork(creator.getId());
        String workId = work.getId().toString();
        assertThat(workFeedMongoRepository.findByWorkId(workId)).isPresent();

        moderationApplicationService.suspendWork(work.getId(), "Teste de integração");
        assertThat(workFeedMongoRepository.findByWorkId(workId)).isEmpty();

        // O job periódico reindexa o catálogo inteiro: a obra suspensa precisa continuar fora do feed.
        algorithmService.syncAllWorksToFeed();

        assertThat(workFeedMongoRepository.findByWorkId(workId)).isEmpty();
    }

    @Test
    @DisplayName("Consulta do feed já exclui suspensas: a página é preenchida mesmo com suspensa no topo")
    void getFeed_fillsPageEvenWithSuspendedDocRankedFirst() {
        CreatorEntity creator = newCreator();
        newWork(creator.getId());
        newWork(creator.getId());

        // Cenário de borda: um documento suspenso no topo do ranking (não pode consumir slot da página).
        WorkFeedDocument suspended = new WorkFeedDocument();
        suspended.setWorkId(UUID.randomUUID().toString());
        suspended.setSlug("oculta-" + UUID.randomUUID().toString().substring(0, 6));
        suspended.setTitle("Oculta");
        suspended.setStatus("suspended");
        suspended.setDiscoveryScore(99_999_999.0);
        suspended.setTrendingScore(99_999_999.0);
        workFeedMongoRepository.save(suspended);

        List<FeedWorkResponseDto> page = feedApplicationService.getFeed("recommended", null, 0, 2);

        assertThat(page).hasSize(2);
        assertThat(page).extracting(FeedWorkResponseDto::workId)
                .doesNotContain(suspended.getWorkId());
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
