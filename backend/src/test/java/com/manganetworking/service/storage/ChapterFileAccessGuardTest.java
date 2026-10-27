package com.manganetworking.service.storage;
import com.manganetworking.domain.enums.WorkStatus;

import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.ChapterFileEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterFileRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.service.session.SessionService;
import org.junit.jupiter.api.AfterEach;
import com.manganetworking.domain.enums.MembershipStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChapterFileAccessGuardTest {

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private ChapterFileRepository chapterFileRepository;

    @Mock
    private MembershipSubscriptionRepository membershipRepository;

    @InjectMocks
    private ChapterFileAccessGuard guard;

    private UUID authorCreatorId;
    private CreatorEntity author;
    private WorkEntity work;

    @BeforeEach
    void setUp() {
        authorCreatorId = UUID.randomUUID();

        author = new CreatorEntity();
        author.setId(authorCreatorId);
        author.setHandle("autor");

        work = new WorkEntity();
        work.setId(UUID.randomUUID());
        work.setAuthor(author);
        work.setStatus(WorkStatus.ONGOING);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ChapterEntity chapterReleasingAt(LocalDateTime release) {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setWork(work);
        chapter.setChapterNumber(1);
        chapter.setTitle("Capítulo de teste");
        chapter.setPagesJson("[\"/api/storage/page.jpg\"]");
        chapter.setPublicReleaseAt(release);
        return chapter;
    }

    /** Liga o arquivo ao capítulo — é exatamente o que a linha de {@code chapter_files} representa. */
    private void chapterFilePointsTo(String filename, ChapterEntity chapter) {
        when(chapterFileRepository.findByFilename(filename))
                .thenReturn(Optional.of(new ChapterFileEntity(chapter.getId(), filename, 0)));
        when(chapterRepository.findById(chapter.getId())).thenReturn(Optional.of(chapter));
    }

    private void authenticateAs(UUID userId, UUID creatorId, boolean moderator) {
        SessionService.UserSession session = new SessionService.UserSession(
                "sid", userId, "user@manganetworking.com", "Usuário",
                creatorId != null, moderator, creatorId,
                creatorId != null ? "handle" : null,
                Instant.now().plusSeconds(3600));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(session, null, Collections.emptyList()));
    }

    @Test
    @DisplayName("Arquivos que não são página de capítulo (capa/avatar) permanecem públicos e cacheáveis")
    void allowsNonChapterFilesPublicly() {
        when(chapterFileRepository.findByFilename("capa.jpg")).thenReturn(Optional.empty());

        ChapterFileAccessGuard.AccessDecision decision = guard.evaluate("capa.jpg");

        assertTrue(decision.allowed());
        assertFalse(decision.privateContent());
        // Sem página associada, o guard nem consulta os capítulos.
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("Nome de arquivo vazio é negado")
    void deniesBlankFilename() {
        assertFalse(guard.canRead("  "));
    }

    @Test
    @DisplayName("Consulta é por igualdade exata: nome parecido não é tratado como página de capítulo")
    void lookupIsByExactFilenameNotSubstring() {
        // "page.jpg" é página de capítulo; "capa-page.jpg" não é. Com LIKE, o segundo casaria com o primeiro.
        when(chapterFileRepository.findByFilename("capa-page.jpg")).thenReturn(Optional.empty());

        assertTrue(guard.canRead("capa-page.jpg"));

        verify(chapterFileRepository).findByFilename("capa-page.jpg");
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("Página de capítulo público é liberada para anônimo e marcada como privada (não cacheável)")
    void allowsPublicChapterAnonymously() {
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().minusDays(2)));

        ChapterFileAccessGuard.AccessDecision decision = guard.evaluate("page.jpg");

        assertTrue(decision.allowed());
        assertTrue(decision.privateContent());
    }

    @Test
    @DisplayName("Página de capítulo em early access é negada para anônimo")
    void blocksEarlyAccessAnonymously() {
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().plusDays(5)));

        assertFalse(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de capítulo em early access é liberada para membro ativo do autor")
    void allowsEarlyAccessForMember() {
        UUID userId = UUID.randomUUID();
        authenticateAs(userId, null, false);
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().plusDays(5)));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                eq(userId), eq(authorCreatorId), eq(MembershipStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(true);

        assertTrue(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de capítulo em early access é negada para não-membro autenticado")
    void blocksEarlyAccessForNonMember() {
        UUID userId = UUID.randomUUID();
        authenticateAs(userId, null, false);
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().plusDays(5)));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                eq(userId), eq(authorCreatorId), eq(MembershipStatus.ACTIVE), any(LocalDateTime.class)))
                .thenReturn(false);

        assertFalse(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de early access é liberada para o próprio autor (sem exigir assinatura)")
    void allowsEarlyAccessForAuthor() {
        authenticateAs(UUID.randomUUID(), authorCreatorId, true);
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().plusDays(5)));

        assertTrue(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de obra suspensa é negada para anônimo")
    void blocksSuspendedWorkAnonymously() {
        work.setStatus(WorkStatus.SUSPENDED);
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().minusDays(2)));

        assertFalse(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de obra arquivada por exclusão LGPD é negada mesmo por URL antiga")
    void blocksLgpdArchivedWork() {
        work.setStatus(WorkStatus.ARCHIVED_LGPD);
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().minusDays(2)));

        ChapterFileAccessGuard.AccessDecision decision = guard.evaluate("page.jpg");

        assertFalse(decision.allowed());
        assertTrue(decision.privateContent());
        verifyNoInteractions(membershipRepository);
    }

    @Test
    @DisplayName("Página de obra suspensa é liberada para a moderação")
    void allowsSuspendedWorkForModerator() {
        work.setStatus(WorkStatus.SUSPENDED);
        authenticateAs(UUID.randomUUID(), null, true);
        chapterFilePointsTo("page.jpg", chapterReleasingAt(LocalDateTime.now().minusDays(2)));

        assertTrue(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Referência órfã (arquivo sem capítulo) falha fechada: nega e não permite cache")
    void deniesWhenChapterIsMissing() {
        UUID chapterId = UUID.randomUUID();
        when(chapterFileRepository.findByFilename("page.jpg"))
                .thenReturn(Optional.of(new ChapterFileEntity(chapterId, "page.jpg", 0)));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.empty());

        ChapterFileAccessGuard.AccessDecision decision = guard.evaluate("page.jpg");

        assertFalse(decision.allowed());
        assertTrue(decision.privateContent());
    }
}
