package com.manganetworking.service.work;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.enums.ChapterType;
import com.manganetworking.domain.enums.WorkFormat;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.ChapterFileEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterFileRepository;
import com.manganetworking.repository.jpa.ChapterLikeRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.notification.NotificationService;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkApplicationServiceTest {

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private ChapterFileRepository chapterFileRepository;

    @Mock
    private MembershipSubscriptionRepository membershipRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private ChapterLikeRepository chapterLikeRepository;

    @Mock
    private PlatformProperties properties;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private WorkApplicationService workService;

    private CreatorEntity author;
    private WorkEntity work;
    private UUID creatorId;
    private UUID workId;

    @BeforeEach
    void setUp() {
        creatorId = UUID.randomUUID();
        workId = UUID.randomUUID();

        author = new CreatorEntity();
        author.setId(creatorId);
        author.setHandle("autor_independente");

        work = new WorkEntity();
        work.setId(workId);
        work.setAuthor(author);
        work.setTitle("Crônicas de Cyberpunk");
        work.setSlug("cronicas-de-cyberpunk");
    }

    @Test
    @DisplayName("Deve criar obra com sucesso se declaração de autoria original for verdadeira")
    void shouldCreateWorkWithOriginalAuthorDeclaration() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(author));
        when(workRepository.findBySlug(any())).thenReturn(Optional.empty());
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(i -> i.getArgument(0));

        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                "Nova Obra Original",
                "Original",
                "Sinopse rica de mangá.",
                "https://storage.local/capa.jpg",
                null,
                List.of(Genre.ACAO, Genre.FANTASIA),
                true
        );

        WorkEntity created = workService.createWork(creatorId, dto);

        assertNotNull(created);
        assertEquals("Nova Obra Original", created.getTitle());
        assertEquals(author, created.getAuthor());
        verify(workRepository).save(any(WorkEntity.class));
    }

    @Test
    @DisplayName("Publica evento de sincronização do feed ao criar a obra (tratado fora da transação, em AFTER_COMMIT)")
    void shouldPublishFeedSyncEventAfterCreate() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(author));
        when(workRepository.findBySlug(any())).thenReturn(Optional.empty());
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> {
            WorkEntity saved = invocation.getArgument(0);
            saved.setId(workId);
            return saved;
        });

        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                "Obra com sync por evento",
                "Original",
                "Sinopse rica de mangá.",
                "https://storage.local/capa.jpg",
                null,
                List.of(Genre.ACAO),
                true
        );

        WorkEntity created = workService.createWork(creatorId, dto);

        assertNotNull(created);
        // O serviço não escreve no Mongo: publica o pedido; quem sincroniza é o FeedSynchronizationListener.
        verify(eventPublisher).publishEvent(new WorkFeedSyncEvent(workId, "cadastro"));
    }

    @Test
    @DisplayName("Publica evento de sincronização do feed ao publicar capítulo")
    void shouldPublishFeedSyncEventOnChapterPublish() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo 1", null, List.of("p1.png"), LocalDateTime.now().plusDays(2));

        workService.createChapter(creatorId, workId, dto);

        verify(eventPublisher).publishEvent(new WorkFeedSyncEvent(workId, "publicação de capítulo"));
    }

    @Test
    @DisplayName("Rejeita capítulo acima do limite de páginas antes de consultar a obra")
    void rejectsChapterWithTooManyPages() {
        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo extenso", null,
                java.util.Collections.nCopies(301, "pagina.jpg"),
                LocalDateTime.now().plusDays(1));

        assertThrows(IllegalArgumentException.class, () -> workService.createChapter(creatorId, workId, dto));
        verifyNoInteractions(workRepository, chapterRepository, chapterFileRepository);
    }

    @Test
    @SuppressWarnings("unchecked")
    @DisplayName("Publicar capítulo registra a relação arquivo→capítulo com o nome do arquivo normalizado")
    void shouldRegisterChapterFilesOnChapterPublish() {
        UUID chapterId = UUID.randomUUID();
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> {
            ChapterEntity saved = invocation.getArgument(0);
            saved.setId(chapterId);
            return saved;
        });
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo 1", null,
                List.of("/api/storage/aaa.png", "/api/uploads/bbb.png", "ccc.png"),
                LocalDateTime.now().plusDays(2));

        workService.createChapter(creatorId, workId, dto);

        ArgumentCaptor<List<ChapterFileEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(chapterFileRepository).saveAll(captor.capture());
        List<ChapterFileEntity> files = captor.getValue();
        assertEquals(List.of("aaa.png", "bbb.png", "ccc.png"),
                files.stream().map(ChapterFileEntity::getFilename).toList(),
                "A URL da página deve ser reduzida ao nome do arquivo que o guard recebe");
        assertEquals(List.of(0, 1, 2), files.stream().map(ChapterFileEntity::getPosition).toList());
        assertTrue(files.stream().allMatch(file -> chapterId.equals(file.getChapterId())));
    }

    @Test
    @SuppressWarnings("unchecked")
    @DisplayName("Página repetida no mesmo capítulo é registrada uma única vez (filename é único em toda a tabela)")
    void shouldDeduplicateRepeatedChapterPages() {
        UUID chapterId = UUID.randomUUID();
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> {
            ChapterEntity saved = invocation.getArgument(0);
            saved.setId(chapterId);
            return saved;
        });
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // A mesma página enviada em duas formas (URL e nome puro) canonicaliza para um único arquivo.
        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo 1", null,
                List.of("/api/storage/dup.png", "dup.png"),
                LocalDateTime.now().plusDays(2));

        workService.createChapter(creatorId, workId, dto);

        ArgumentCaptor<List<ChapterFileEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(chapterFileRepository).saveAll(captor.capture());
        assertEquals(List.of("dup.png"),
                captor.getValue().stream().map(ChapterFileEntity::getFilename).toList());
    }

    @Test
    @SuppressWarnings("unchecked")
    @DisplayName("Capítulo em blocos registra as ilustrações para herdarem o acesso do capítulo")
    void shouldRegisterIllustrationFilesForAccessControl() {
        work.setFormat(WorkFormat.LIGHT_NOVEL);
        UUID chapterId = UUID.randomUUID();
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> {
            ChapterEntity saved = invocation.getArgument(0);
            saved.setId(chapterId);
            return saved;
        });
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String text = "Parágrafo " + "a".repeat(1_100);
        String blocksJson = "{\"version\":1,\"blocks\":["
                + "{\"type\":\"text\",\"content\":{\"text\":\"" + text + "\"}},"
                + "{\"type\":\"illustration\",\"content\":{\"fileId\":\"ilustracao-1.png\",\"altText\":\"Cena\"}},"
                + "{\"type\":\"separator\",\"content\":{\"style\":\"scene\"}}"
                + "]}";

        workService.createChapter(creatorId, workId, new CreateChapterRequestDto(
                1, "Capítulo 1", null, List.of(), LocalDateTime.now(),
                ChapterFormat.PROSE, ChapterType.REGULAR, null, blocksJson));

        ArgumentCaptor<List<ChapterFileEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(chapterFileRepository).saveAll(captor.capture());
        assertEquals(List.of("ilustracao-1.png"),
                captor.getValue().stream().map(ChapterFileEntity::getFilename).toList(),
                "Sem esse vínculo o guard trataria a ilustração como conteúdo público");
    }

    @Test
    @DisplayName("Publica capítulo em prosa sem alterar o contrato de páginas do mangá")
    void shouldPublishProseChapterForLightNovel() {
        work.setFormat(WorkFormat.LIGHT_NOVEL);
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Capítulo regular tem piso de 1.000 caracteres visíveis; HTML removido antes da contagem.
        String longText = "Texto seguro " + "a".repeat(1_000);
        ChapterEntity created = workService.createChapter(creatorId, workId, new CreateChapterRequestDto(
                1, "Capítulo 1", null, List.of(), LocalDateTime.now().minusMinutes(1),
                ChapterFormat.PROSE, ChapterType.REGULAR, "<script>alert(1)</script>" + longText, null));

        assertEquals(ChapterFormat.PROSE, created.getFormat());
        assertNull(created.getPagesJson());
        assertEquals(longText, created.getContentText());
        verifyNoInteractions(chapterFileRepository);
    }

    @Test
    @DisplayName("Não permite misturar capítulo em prosa com obra de mangá")
    void rejectsProseChapterOnMangaWork() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));

        assertThrows(IllegalArgumentException.class, () -> workService.createChapter(creatorId, workId,
                new CreateChapterRequestDto(1, "Capítulo 1", null, List.of(), LocalDateTime.now(),
                        ChapterFormat.PROSE, ChapterType.REGULAR, "x".repeat(1_000), null)));
        verify(chapterRepository, never()).save(any());
    }

    @Test
    @DisplayName("Obra suspensa cautelarmente não é exposta no detalhe para visitante → 403")
    void shouldHideSuspendedWorkFromPublicDetail() {
        work.setStatus("suspended");
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));

        assertThrows(AccessDeniedException.class, () ->
                workService.getWorkBySlug("cronicas-de-cyberpunk", null));
    }

    @Test
    @DisplayName("Detalhe público lista o capítulo PROGRAMADO (o leitor vê que vem mais)")
    void shouldListScheduledChapterForPublicViewer() {
        ChapterEntity released = chapter(1, LocalDateTime.now().minusMinutes(1));
        ChapterEntity scheduled = chapter(2, LocalDateTime.now().plusDays(1));
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(workId))
                .thenReturn(List.of(scheduled, released));

        WorkDetailsResponseDto response = workService.getWorkBySlug("cronicas-de-cyberpunk", null);

        // O capitulo programado aparece (para o leitor querer assinar e ler antes),
        // marcado como acesso antecipado; o conteudo so e liberado conforme as regras.
        assertEquals(List.of(2, 1), response.chapters().stream().map(chapter -> chapter.chapterNumber()).toList());
        assertTrue(response.chapters().stream()
                .filter(chapter -> chapter.chapterNumber() == 2)
                .allMatch(chapter -> chapter.isEarlyAccess()));
    }

    @Test
    @DisplayName("Obras arquivadas por exclusão LGPD não podem mais ser consultadas")
    void shouldHideLgpdArchivedWork() {
        work.setStatus("archived_lgpd");
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));

        assertThrows(ResourceNotFoundException.class, () ->
                workService.getWorkBySlug("cronicas-de-cyberpunk", null));
        verifyNoInteractions(chapterRepository);
    }

    private ChapterEntity chapter(int number, LocalDateTime releaseAt) {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setWork(work);
        chapter.setChapterNumber(number);
        chapter.setTitle("Capítulo " + number);
        chapter.setPagesJson("[]");
        chapter.setPublicReleaseAt(releaseAt);
        return chapter;
    }

    @Test
    @DisplayName("Deve rejeitar criação de obra se o autor não declarar autoria original (Anti-Pirataria)")
    void shouldRejectWorkWithoutOriginalAuthorDeclaration() {
        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                "Obra Suspeita",
                null,
                "Sinopse",
                "https://storage.local/capa.jpg",
                null,
                List.of(Genre.SHONEN),
                false // Não declarou autoria
        );

        assertThrows(IllegalArgumentException.class, () ->
                workService.createWork(creatorId, dto)
        );

        verify(workRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve bloquear leitura de capítulo em Early Access para usuário que não é membro")
    void shouldBlockEarlyAccessChapterForNonMember() {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setWork(work);
        chapter.setChapterNumber(5);
        chapter.setTitle("Capítulo Exclusivo para Membros");
        chapter.setPublicReleaseAt(LocalDateTime.now().plusDays(7)); // Em acesso antecipado

        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 5)).thenReturn(Optional.of(chapter));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                any(), any(), eq("ACTIVE"), any()
        )).thenReturn(false);

        UUID nonMemberUserId = UUID.randomUUID();

        assertThrows(AccessDeniedException.class, () ->
                workService.readChapter("cronicas-de-cyberpunk", 5, nonMemberUserId)
        );
    }

    @Test
    @DisplayName("O autor lê o próprio capítulo PROGRAMADO (sem trava de acesso antecipado)")
    void shouldAllowAuthorToReadOwnScheduledChapter() {
        UserEntity owner = new UserEntity();
        owner.setId(UUID.randomUUID());
        author.setUser(owner);

        ChapterEntity scheduled = chapter(7, LocalDateTime.now().plusDays(3));
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 7)).thenReturn(Optional.of(scheduled));

        var response = workService.readChapter("cronicas-de-cyberpunk", 7, owner.getId());

        assertEquals(7, response.chapterNumber());
        verify(membershipRepository, never()).existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                any(), any(), any(), any());
    }

    @Test
    @DisplayName("Leitura do capítulo expõe os blocos e o tipo editorial de light novel")
    void shouldExposeBlocksAndChapterTypeOnRead() {
        UserEntity owner = new UserEntity();
        owner.setId(UUID.randomUUID());
        author.setUser(owner);

        ChapterEntity prologue = chapter(0, LocalDateTime.now().minusDays(1));
        prologue.setFormat(ChapterFormat.PROSE);
        prologue.setChapterType(ChapterType.PROLOGUE);
        prologue.setBlocksJson("{\"version\":1,\"blocks\":[{\"type\":\"text\",\"content\":{\"text\":\"Prólogo\"}}]}");
        prologue.setContentText("Prólogo");

        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 0)).thenReturn(Optional.of(prologue));

        var response = workService.readChapter("cronicas-de-cyberpunk", 0, owner.getId());

        assertEquals(ChapterType.PROLOGUE, response.chapterType());
        assertEquals(prologue.getBlocksJson(), response.blocksJson());
        assertEquals("Prólogo", response.content());
    }

    @Test
    @DisplayName("Abrir o capítulo não conta visualização; quem conta é a primeira página lida")
    void shouldNotCountViewWhenChapterIsOpened() {
        ChapterEntity released = chapter(8, LocalDateTime.now().minusDays(1));
        released.setViews(3L);
        work.setTotalViews(10L);

        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 8)).thenReturn(Optional.of(released));

        workService.readChapter("cronicas-de-cyberpunk", 8, null);

        assertEquals(3L, released.getViews());
        assertEquals(10L, work.getTotalViews());
        verify(chapterRepository, never()).save(released);
        verify(workRepository, never()).save(work);
    }

    @Test
    @DisplayName("Autor exclui o próprio capítulo e a contagem da obra acompanha")
    void shouldDeleteChapterAndUpdateWorkCounter() {
        ChapterEntity scheduled = chapter(3, LocalDateTime.now().plusDays(2));
        scheduled.setLikes(7L);
        work.setTotalChapters(4);
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 3)).thenReturn(Optional.of(scheduled));

        workService.deleteChapter(creatorId, workId, 3);

        verify(chapterRepository).delete(scheduled);
        assertEquals(3, work.getTotalChapters());
        verify(workRepository).saveAndFlush(work);
        // A obra agrega curtidas de capítulos: excluir o capítulo remove só as 7 dele.
        verify(workRepository).decrementTotalLikesBy(workId, 7L);
    }

    @Test
    @DisplayName("Capitulo de outro autor não pode ser excluído")
    void shouldDenyChapterDeletionByNonAuthor() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));

        assertThrows(AccessDeniedException.class, () ->
                workService.deleteChapter(UUID.randomUUID(), workId, 1)
        );
        verify(chapterRepository, never()).delete(any());
    }
}
