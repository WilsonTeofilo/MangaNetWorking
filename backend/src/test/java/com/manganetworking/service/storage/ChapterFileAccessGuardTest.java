package com.manganetworking.service.storage;

import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.service.session.SessionService;
import org.junit.jupiter.api.AfterEach;
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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChapterFileAccessGuardTest {

    @Mock
    private ChapterRepository chapterRepository;

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
        work.setStatus("ongoing");
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private ChapterEntity chapterReleasingAt(LocalDateTime release) {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setWork(work);
        chapter.setChapterNumber(1);
        chapter.setTitle("Capítulo de teste");
        chapter.setPagesJson("[\"/api/storage/page.jpg\"]");
        chapter.setPublicReleaseAt(release);
        return chapter;
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
    @DisplayName("Arquivos que não são página de capítulo (capa/avatar) permanecem públicos")
    void allowsNonChapterFilesPublicly() {
        when(chapterRepository.findFirstByPagesJsonContaining("capa.jpg")).thenReturn(Optional.empty());
        assertTrue(guard.canRead("capa.jpg"));
    }

    @Test
    @DisplayName("Nome de arquivo vazio é negado")
    void deniesBlankFilename() {
        assertFalse(guard.canRead("  "));
    }

    @Test
    @DisplayName("Página de capítulo público é liberada para anônimo")
    void allowsPublicChapterAnonymously() {
        when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().minusDays(2))));
        assertTrue(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de capítulo em early access é negada para anônimo")
    void blocksEarlyAccessAnonymously() {
        when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().plusDays(5))));
        assertFalse(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de capítulo em early access é liberada para membro ativo do autor")
    void allowsEarlyAccessForMember() {
        UUID userId = UUID.randomUUID();
        authenticateAs(userId, null, false);
        when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().plusDays(5))));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                eq(userId), eq(authorCreatorId), eq("ACTIVE"), any(LocalDateTime.class)))
                .thenReturn(true);

        assertTrue(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de capítulo em early access é negada para não-membro autenticado")
    void blocksEarlyAccessForNonMember() {
        UUID userId = UUID.randomUUID();
        authenticateAs(userId, null, false);
        when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().plusDays(5))));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                eq(userId), eq(authorCreatorId), eq("ACTIVE"), any(LocalDateTime.class)))
                .thenReturn(false);

        assertFalse(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de early access é liberada para o próprio autor (sem exigir assinatura)")
    void allowsEarlyAccessForAuthor() {
        authenticateAs(UUID.randomUUID(), authorCreatorId, true);
        when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().plusDays(5))));

        assertTrue(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de obra suspensa é negada para anônimo")
    void blocksSuspendedWorkAnonymously() {
        work.setStatus("suspended");
        when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().minusDays(2))));

        assertFalse(guard.canRead("page.jpg"));
    }

    @Test
    @DisplayName("Página de obra suspensa é liberada para a moderação")
    void allowsSuspendedWorkForModerator() {
        work.setStatus("suspended");
        authenticateAs(UUID.randomUUID(), null, true);
        lenient().when(chapterRepository.findFirstByPagesJsonContaining("page.jpg"))
                .thenReturn(Optional.of(chapterReleasingAt(LocalDateTime.now().minusDays(2))));

        assertTrue(guard.canRead("page.jpg"));
    }
}
