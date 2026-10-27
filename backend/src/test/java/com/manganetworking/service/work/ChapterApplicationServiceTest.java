package com.manganetworking.service.work;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.enums.MembershipStatus;
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
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.notification.NotificationService;
import com.manganetworking.service.work.dto.ChapterSummaryDto;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
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
class ChapterApplicationServiceTest {

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private ChapterFileRepository chapterFileRepository;

    @Mock
    private MembershipSubscriptionRepository membershipRepository;

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
    private ChapterApplicationService chapterService;

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
        work.setFormat(WorkFormat.MANGA);
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
    @DisplayName("Publica evento de sincronização do feed ao publicar capítulo")
    void shouldPublishFeedSyncEventOnChapterPublish() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo 1", null, List.of("p1.png"), LocalDateTime.now().plusDays(2));

        chapterService.createChapter(creatorId, workId, dto);

        verify(eventPublisher).publishEvent(new WorkFeedSyncEvent(workId, "publicação de capítulo"));
    }

    @Test
    @DisplayName("Rejeita capítulo acima do limite de páginas antes de consultar a obra")
    void rejectsChapterWithTooManyPages() {
        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo extenso", null,
                java.util.Collections.nCopies(301, "pagina.jpg"),
                LocalDateTime.now().plusDays(1));

        assertThrows(IllegalArgumentException.class, () -> chapterService.createChapter(creatorId, workId, dto));
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

        chapterService.createChapter(creatorId, workId, dto);

        ArgumentCaptor<List<ChapterFileEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(chapterFileRepository).saveAll(captor.capture());
        List<ChapterFileEntity> files = captor.getValue();
        assertEquals(List.of("aaa.png", "bbb.png", "ccc.png"),
                files.stream().map(ChapterFileEntity::getFilename).toList());
        assertEquals(List.of(0, 1, 2), files.stream().map(ChapterFileEntity::getPosition).toList());
        assertTrue(files.stream().allMatch(file -> chapterId.equals(file.getChapterId())));
    }

    @Test
    @SuppressWarnings("unchecked")
    @DisplayName("Página repetida no mesmo capítulo é registrada uma única vez")
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

        CreateChapterRequestDto dto = new CreateChapterRequestDto(
                1, "Capítulo 1", null,
                List.of("/api/storage/dup.png", "dup.png"),
                LocalDateTime.now().plusDays(2));

        chapterService.createChapter(creatorId, workId, dto);

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

        chapterService.createChapter(creatorId, workId, new CreateChapterRequestDto(
                1, "Capítulo 1", null, List.of(), LocalDateTime.now(),
                ChapterFormat.PROSE, ChapterType.REGULAR, null, blocksJson));

        ArgumentCaptor<List<ChapterFileEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(chapterFileRepository).saveAll(captor.capture());
        assertEquals(List.of("ilustracao-1.png"),
                captor.getValue().stream().map(ChapterFileEntity::getFilename).toList());
    }

    @Test
    @DisplayName("Publica capítulo em prosa retornando ChapterSummaryDto imutável")
    void shouldPublishProseChapterForLightNovel() {
        work.setFormat(WorkFormat.LIGHT_NOVEL);
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.empty());
        when(chapterRepository.save(any(ChapterEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        String longText = "Texto seguro " + "a".repeat(1_000);
        ChapterSummaryDto created = chapterService.createChapter(creatorId, workId, new CreateChapterRequestDto(
                1, "Capítulo 1", null, List.of(), LocalDateTime.now().minusMinutes(1),
                ChapterFormat.PROSE, ChapterType.REGULAR, "<script>alert(1)</script>" + longText, null));

        assertEquals(ChapterFormat.PROSE, created.format());
        assertEquals("Capítulo 1", created.title());
        assertEquals(1, created.chapterNumber());
        verifyNoInteractions(chapterFileRepository);
    }

    @Test
    @DisplayName("Não permite misturar capítulo em prosa com obra de mangá")
    void rejectsProseChapterOnMangaWork() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));

        assertThrows(IllegalArgumentException.class, () -> chapterService.createChapter(creatorId, workId,
                new CreateChapterRequestDto(1, "Capítulo 1", null, List.of(), LocalDateTime.now(),
                        ChapterFormat.PROSE, ChapterType.REGULAR, "x".repeat(1_000), null)));
        verify(chapterRepository, never()).save(any());
    }

    @Test
    @DisplayName("Deve bloquear leitura de capítulo em Early Access para usuário que não é membro")
    void shouldBlockEarlyAccessChapterForNonMember() {
        ChapterEntity ch = new ChapterEntity();
        ch.setId(UUID.randomUUID());
        ch.setWork(work);
        ch.setChapterNumber(5);
        ch.setTitle("Capítulo Exclusivo para Membros");
        ch.setPublicReleaseAt(LocalDateTime.now().plusDays(7));

        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 5)).thenReturn(Optional.of(ch));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                any(), any(), eq(MembershipStatus.ACTIVE), any()
        )).thenReturn(false);

        UUID nonMemberUserId = UUID.randomUUID();

        assertThrows(AccessDeniedException.class, () ->
                chapterService.readChapter("cronicas-de-cyberpunk", 5, nonMemberUserId)
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

        var response = chapterService.readChapter("cronicas-de-cyberpunk", 7, owner.getId());

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

        var response = chapterService.readChapter("cronicas-de-cyberpunk", 0, owner.getId());

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

        chapterService.readChapter("cronicas-de-cyberpunk", 8, null);

        assertEquals(3L, released.getViews());
        assertEquals(10L, work.getTotalViews());
        verify(chapterRepository, never()).save(released);
        verify(workRepository, never()).save(work);
    }

    @Test
    @DisplayName("Autor exclui o próprio capítulo decrementando curtidas E visualizações da obra")
    void shouldDeleteChapterAndUpdateWorkCounterAndViews() {
        ChapterEntity scheduled = chapter(3, LocalDateTime.now().plusDays(2));
        scheduled.setLikes(7L);
        scheduled.setViews(42L);
        work.setTotalChapters(4);
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 3)).thenReturn(Optional.of(scheduled));

        chapterService.deleteChapter(creatorId, workId, 3);

        verify(chapterRepository).delete(scheduled);
        assertEquals(3, work.getTotalChapters());
        verify(workRepository).saveAndFlush(work);
        verify(workRepository).decrementTotalLikesBy(workId, 7L);
        verify(workRepository).decrementTotalViewsBy(workId, 42L);
    }

    @Test
    @DisplayName("Capitulo de outro autor não pode ser excluído")
    void shouldDenyChapterDeletionByNonAuthor() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));

        assertThrows(AccessDeniedException.class, () ->
                chapterService.deleteChapter(UUID.randomUUID(), workId, 1)
        );
        verify(chapterRepository, never()).delete(any());
    }
}
