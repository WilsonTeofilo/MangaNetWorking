package com.manganetworking.service.mobile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.mobile.dto.OfflineDownloadManifestDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MobileOfflineApplicationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private MembershipSubscriptionRepository membershipRepository;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private MobileOfflineApplicationService mobileService;

    private UserEntity vipUser;
    private UserEntity nonVipUser;
    private CreatorEntity author;
    private WorkEntity work;
    private ChapterEntity publicChapter;
    private ChapterEntity earlyAccessChapter;
    private UUID userId;
    private UUID creatorId;
    private UUID chapterId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        creatorId = UUID.randomUUID();
        chapterId = UUID.randomUUID();

        vipUser = new UserEntity();
        vipUser.setId(userId);
        vipUser.setName("Leitor VIP");
        vipUser.setEmail("vip@gmail.com");
        vipUser.setVip(true);
        vipUser.setVipExpiresAt(LocalDateTime.now().plusDays(30));

        nonVipUser = new UserEntity();
        nonVipUser.setId(userId);
        nonVipUser.setName("Leitor Comum");
        nonVipUser.setEmail("comum@gmail.com");
        nonVipUser.setVip(false);

        author = new CreatorEntity();
        author.setId(creatorId);
        author.setHandle("autor-nacional");

        work = new WorkEntity();
        work.setId(UUID.randomUUID());
        work.setTitle("O Retorno dos Bravos");
        work.setAuthor(author);

        publicChapter = new ChapterEntity();
        publicChapter.setId(chapterId);
        publicChapter.setWork(work);
        publicChapter.setChapterNumber(1);
        publicChapter.setTitle("Capítulo 1: O Começo");
        publicChapter.setPublicReleaseAt(LocalDateTime.now().minusDays(2)); // Liberado
        publicChapter.setPagesJson("[\"/api/storage/page-1.jpg\",\"/api/storage/page-2.jpg\"]");

        earlyAccessChapter = new ChapterEntity();
        earlyAccessChapter.setId(chapterId);
        earlyAccessChapter.setWork(work);
        earlyAccessChapter.setChapterNumber(2);
        earlyAccessChapter.setTitle("Capítulo 2: Antecipado");
        earlyAccessChapter.setPublicReleaseAt(LocalDateTime.now().plusDays(5)); // Antecipado
        earlyAccessChapter.setPagesJson("[\"/api/storage/page-3.jpg\",\"/api/storage/page-4.jpg\"]");
    }

    @Test
    @DisplayName("Deve rejeitar download offline se o usuário NÃO for assinante VIP")
    void shouldRejectOfflineDownloadIfUserIsNotVip() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(nonVipUser));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                mobileService.generateOfflineManifest(userId, chapterId));

        assertTrue(ex.getMessage().contains("exclusivo para assinantes VIP"));
        verify(chapterRepository, never()).findById(any());
    }

    @Test
    @DisplayName("Deve permitir download offline de capítulo público para usuário VIP com FLAG_SECURE")
    void shouldAllowOfflineDownloadOfPublicChapterForVipUser() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(vipUser));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(publicChapter));

        OfflineDownloadManifestDto manifest = mobileService.generateOfflineManifest(userId, chapterId);

        assertNotNull(manifest);
        assertEquals(publicChapter.getId(), manifest.chapterId());
        assertEquals(work.getTitle(), manifest.workTitle());
        assertEquals(2, manifest.pages().size());
        assertTrue(manifest.requiresSecureWindow());
        assertNotNull(manifest.clientEncryptionKeyId());
    }

    @Test
    @DisplayName("Deve BLOQUEAR download de capítulo antecipado se usuário VIP NÃO for membro do criador")
    void shouldBlockEarlyAccessDownloadIfVipUserIsNotCreatorMember() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(vipUser));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(earlyAccessChapter));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                eq(userId), eq(creatorId), eq("ACTIVE"), any(LocalDateTime.class)
        )).thenReturn(false);

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                mobileService.generateOfflineManifest(userId, chapterId));

        assertTrue(ex.getMessage().contains("não substitui o Clube de Membros do autor"));
    }

    @Test
    @DisplayName("Deve PERMITIR download de capítulo antecipado se usuário VIP for membro ativo do criador")
    void shouldAllowEarlyAccessDownloadIfVipUserIsCreatorMember() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(vipUser));
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(earlyAccessChapter));
        when(membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                eq(userId), eq(creatorId), eq("ACTIVE"), any(LocalDateTime.class)
        )).thenReturn(true);

        OfflineDownloadManifestDto manifest = mobileService.generateOfflineManifest(userId, chapterId);

        assertNotNull(manifest);
        assertEquals(earlyAccessChapter.getId(), manifest.chapterId());
        assertTrue(manifest.requiresSecureWindow());
    }
}
