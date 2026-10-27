package com.manganetworking.service.work;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.WorkStatus;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.work.dto.ChapterSummaryDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
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
    private CreatorRepository creatorRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

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
        work.setStatus(WorkStatus.ONGOING);
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

        WorkDetailsResponseDto created = workService.createWork(creatorId, dto);

        assertNotNull(created);
        assertEquals("Nova Obra Original", created.title());
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

        WorkDetailsResponseDto created = workService.createWork(creatorId, dto);

        assertNotNull(created);
        verify(eventPublisher).publishEvent(new WorkFeedSyncEvent(workId, "cadastro"));
    }

    @Test
    @DisplayName("Obra suspensa cautelarmente não é exposta no detalhe para visitante → 403")
    void shouldHideSuspendedWorkFromPublicDetail() {
        work.setStatus(WorkStatus.SUSPENDED);
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

        assertEquals(List.of(2, 1), response.chapters().stream().map(ChapterSummaryDto::chapterNumber).toList());
        assertTrue(response.chapters().stream()
                .filter(c -> c.chapterNumber() == 2)
                .allMatch(ChapterSummaryDto::isEarlyAccess));
    }

    @Test
    @DisplayName("Obras arquivadas por exclusão LGPD não podem mais ser consultadas")
    void shouldHideLgpdArchivedWork() {
        work.setStatus(WorkStatus.ARCHIVED_LGPD);
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
        chapter.setPagesJson("[\"p1.png\"]");
        chapter.setPublicReleaseAt(releaseAt);
        return chapter;
    }
}
