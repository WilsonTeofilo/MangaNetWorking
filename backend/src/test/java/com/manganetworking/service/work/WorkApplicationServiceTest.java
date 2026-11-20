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
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.storage.FilePolicyException;
import com.manganetworking.service.work.dto.ChapterSummaryDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import com.manganetworking.service.work.dto.UpdateWorkRequestDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
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
    @DisplayName("Deve criar obra com sucesso com status DRAFT se declaração de autoria original for verdadeira")
    void shouldCreateWorkWithOriginalAuthorDeclaration() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(author));
        when(workRepository.findBySlug(any())).thenReturn(Optional.empty());
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(i -> i.getArgument(0));

        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                "Nova Obra Original",
                "Original",
                "Sinopse rica de mangá.",
                "/api/storage/11111111-1111-1111-1111-111111111111.jpg",
                null,
                List.of(Genre.ACAO, Genre.FANTASIA),
                true
        );

        WorkDetailsResponseDto created = workService.createWork(creatorId, dto);

        assertNotNull(created);
        assertEquals("Nova Obra Original", created.title());
        assertEquals(WorkStatus.DRAFT.name(), created.status());

        ArgumentCaptor<WorkEntity> workCaptor = ArgumentCaptor.forClass(WorkEntity.class);
        verify(workRepository).save(workCaptor.capture());
        assertEquals(WorkStatus.DRAFT, workCaptor.getValue().getStatus());
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
                "/api/storage/11111111-1111-1111-1111-111111111111.jpg",
                null,
                List.of(Genre.ACAO),
                true
        );

        WorkDetailsResponseDto created = workService.createWork(creatorId, dto);

        assertNotNull(created);
        verify(eventPublisher).publishEvent(new WorkFeedSyncEvent(workId, "cadastro"));
    }

    @Test
    @DisplayName("Autor pode definir apenas status editoriais permitidos")
    void shouldRejectReservedAndUnknownWorkStatusesFromAuthor() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));

        for (String status : List.of("SUSPENDED", "ARCHIVED_LGPD", "INVALID")) {
            UpdateWorkRequestDto dto = new UpdateWorkRequestDto(
                    "Título atualizado", "Sinopse válida com mais de cem caracteres para passar a validação do serviço.",
                    "/api/storage/11111111-1111-1111-1111-111111111111.jpg", null, null, null, status);

            assertThrows(IllegalArgumentException.class, () -> workService.updateWork(creatorId, workId, dto), status);
        }

        verify(workRepository, never()).save(any(WorkEntity.class));
        assertThrows(IllegalArgumentException.class, () -> WorkStatus.fromString("INVALID"));
    }

    @Test
    @DisplayName("Autor pode definir estados editoriais permitidos")
    void shouldAllowEditorialWorkStatusesFromAuthor() {
        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(workRepository.save(any(WorkEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        for (String status : List.of("DRAFT", "ONGOING", "COMPLETED")) {
            UpdateWorkRequestDto dto = new UpdateWorkRequestDto(
                    "Título atualizado", "Sinopse válida com mais de cem caracteres para passar a validação do serviço.",
                    "/api/storage/11111111-1111-1111-1111-111111111111.jpg", null, null, null, status);

            workService.updateWork(creatorId, workId, dto);
            assertEquals(WorkStatus.valueOf(status), work.getStatus());
        }
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

    @Test
    @DisplayName("createWork rejeita capa com URL externa ou fora do padrão do storage")
    void shouldRejectInvalidCoverUrlOnCreateWork() {
        when(creatorRepository.findById(creatorId)).thenReturn(Optional.of(author));

        CreateWorkRequestDto dto = new CreateWorkRequestDto(
                "Nova Obra",
                "Original",
                "Sinopse",
                "https://malicious.com/fake.jpg",
                null,
                List.of(Genre.ACAO),
                true
        );

        assertThrows(FilePolicyException.class, () ->
                workService.createWork(creatorId, dto));
    }

    @Test
    @DisplayName("Obra em DRAFT não é exposta para visitante anônimo → 404")
    void shouldHideDraftWorkFromAnonymousViewer() {
        work.setStatus(WorkStatus.DRAFT);
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));

        assertThrows(ResourceNotFoundException.class, () ->
                workService.getWorkBySlug("cronicas-de-cyberpunk", null));
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("Obra em DRAFT não é exposta para leitor/usuário que não seja o autor nem moderador → 404")
    void shouldHideDraftWorkFromOtherUser() {
        work.setStatus(WorkStatus.DRAFT);
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));

        SessionService.UserSession readerSession = new SessionService.UserSession(
                "sid-reader", UUID.randomUUID(), "leitor@manganetworking.com", "Leitor",
                false, false, UUID.randomUUID(), "outro_autor", Instant.now().plusSeconds(3600)
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(readerSession, null, Collections.emptyList())
        );
        try {
            assertThrows(ResourceNotFoundException.class, () ->
                    workService.getWorkBySlug("cronicas-de-cyberpunk", null));
            verifyNoInteractions(chapterRepository);
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    @DisplayName("Obra em DRAFT é acessível pelo autor criador da obra")
    void shouldAllowAuthorToViewDraftWork() {
        work.setStatus(WorkStatus.DRAFT);
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(workId)).thenReturn(Collections.emptyList());

        SessionService.UserSession authorSession = new SessionService.UserSession(
                "sid-author", UUID.randomUUID(), "autor@manganetworking.com", "Autor",
                true, false, creatorId, "autor_independente", Instant.now().plusSeconds(3600)
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(authorSession, null, Collections.emptyList())
        );
        try {
            WorkDetailsResponseDto response = workService.getWorkBySlug("cronicas-de-cyberpunk", null);
            assertNotNull(response);
            assertEquals("Crônicas de Cyberpunk", response.title());
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    @Test
    @DisplayName("Obra em DRAFT é acessível por moderador")
    void shouldAllowModeratorToViewDraftWork() {
        work.setStatus(WorkStatus.DRAFT);
        when(workRepository.findBySlug("cronicas-de-cyberpunk")).thenReturn(Optional.of(work));
        when(chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(workId)).thenReturn(Collections.emptyList());

        SessionService.UserSession modSession = new SessionService.UserSession(
                "sid-mod", UUID.randomUUID(), "mod@manganetworking.com", "Moderador",
                false, true, null, null, Instant.now().plusSeconds(3600)
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(modSession, null, Collections.emptyList())
        );
        try {
            WorkDetailsResponseDto response = workService.getWorkBySlug("cronicas-de-cyberpunk", null);
            assertNotNull(response);
            assertEquals("Crônicas de Cyberpunk", response.title());
        } finally {
            SecurityContextHolder.clearContext();
        }
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
