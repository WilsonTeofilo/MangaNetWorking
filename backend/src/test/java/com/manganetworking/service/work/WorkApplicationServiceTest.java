package com.manganetworking.service.work;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
    private MembershipSubscriptionRepository membershipRepository;

    @Mock
    private CreatorRepository creatorRepository;

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
    @DisplayName("Obra suspensa cautelarmente não é exposta no detalhe para visitante → 403")
    void shouldHideSuspendedWorkFromPublicDetail() {
        work.setStatus("suspended");
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));

        assertThrows(AccessDeniedException.class, () ->
                workService.getWorkBySlug("cronicas-de-cyberpunk"));
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
}
