package com.manganetworking.service.reading;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.observability.ObservabilityMetricsService;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.AdRevenueLedgerRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ReadingProgressService - Testes de Regressão e Validação de Páginas")
class ReadingProgressServiceValidationTest {

    @Mock
    private ReadingProgressMongoRepository progressMongoRepository;

    @Mock
    private WorkRepository workRepository;

    @Mock
    private ChapterRepository chapterRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @Mock
    private MembershipSubscriptionRepository membershipRepository;

    @Mock
    private AdRevenueLedgerRepository adRevenueLedgerRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PlatformProperties properties;

    @Mock
    private ObservabilityMetricsService observabilityMetricsService;

    @Mock
    private EngagementEventMongoRepository engagementEventRepository;

    @InjectMocks
    private ReadingProgressService readingProgressService;

    private UUID userId;
    private UUID workId;
    private UUID chapterId;
    private WorkEntity work;
    private ChapterEntity chapter;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        workId = UUID.randomUUID();
        chapterId = UUID.randomUUID();

        work = new WorkEntity();
        work.setId(workId);
        work.setTitle("Obra Teste");
        work.setCoverUrl("https://example.com/cover.jpg");

        chapter = new ChapterEntity();
        chapter.setId(chapterId);
        chapter.setWork(work);
        chapter.setChapterNumber(1);
        chapter.setTitle("Capítulo 1");
        // JSON com 3 páginas
        chapter.setPagesJson("[\"page1.jpg\", \"page2.jpg\", \"page3.jpg\"]");
    }

    @Test
    @DisplayName("Uma atualização atrasada não regride a página nem incrementa contador")
    void shouldIgnoreOutOfOrderPageUpdate() {
        chapter.setPagesJson("[\"p1\",\"p2\",\"p3\"]");
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        var existing = new com.manganetworking.domain.nosql.ReadingProgressDocument();
        existing.setUserId(userId.toString());
        existing.setWorkId(workId.toString());
        existing.setChapterId(chapterId.toString());
        existing.setPage(3);
        existing.setCumulativePagesRead(2);
        when(progressMongoRepository.findByUserIdAndWorkId(userId.toString(), workId.toString()))
                .thenReturn(Optional.of(existing));
        when(properties.getAds()).thenReturn(new PlatformProperties.Ads());
        when(progressMongoRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = readingProgressService.trackPageRead(
                userId.toString(), workId.toString(), chapterId.toString(), 1, 3);

        org.assertj.core.api.Assertions.assertThat(result.progress().getPage()).isEqualTo(3);
        org.assertj.core.api.Assertions.assertThat(result.progress().getCumulativePagesRead()).isEqualTo(2);
        org.assertj.core.api.Assertions.assertThat(result.triggerAd()).isFalse();
    }

    @Test
    @DisplayName("Repetir a mesma página não incrementa progresso acumulado nem repete anúncio")
    void shouldNotCountDuplicatePageReads() {
        chapter.setPagesJson("[\"p1\",\"p2\"]");
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        var existing = new com.manganetworking.domain.nosql.ReadingProgressDocument();
        existing.setUserId(userId.toString());
        existing.setWorkId(workId.toString());
        existing.setChapterId(chapterId.toString());
        existing.setPage(1);
        existing.setCumulativePagesRead(1);
        when(progressMongoRepository.findByUserIdAndWorkId(userId.toString(), workId.toString()))
                .thenReturn(Optional.of(existing));
        var ads = new PlatformProperties.Ads();
        ads.setPagesPerAd(2);
        when(properties.getAds()).thenReturn(ads);
        when(progressMongoRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = readingProgressService.trackPageRead(
                userId.toString(), workId.toString(), chapterId.toString(), 1, 2);

        org.assertj.core.api.Assertions.assertThat(result.progress().getCumulativePagesRead()).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(result.triggerAd()).isFalse();
    }

    @Test
    @DisplayName("Deve rejeitar quando totalPages for diferente da quantidade real de páginas do capítulo")
    void shouldRejectWhenTotalPagesDoesNotMatchChapterPages() {
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));

        // Envia totalPages = 5, mas o capítulo tem 3
        assertThatThrownBy(() ->
                readingProgressService.trackPageRead(userId.toString(), workId.toString(), chapterId.toString(), 2, 5)
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("O total de páginas não corresponde ao capítulo");
    }

    @Test
    @DisplayName("Deve rejeitar quando a página for maior que totalPages")
    void shouldRejectWhenPageIsGreaterThanTotalPages() {
        // page = 4, totalPages = 3
        assertThatThrownBy(() ->
                readingProgressService.trackPageRead(userId.toString(), workId.toString(), chapterId.toString(), 4, 3)
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("A página deve estar entre 1 e o total de páginas");
    }

    @Test
    @DisplayName("Deve rejeitar quando o capítulo pertencer a outra obra")
    void shouldRejectWhenChapterDoesNotBelongToWork() {
        UUID otherWorkId = UUID.randomUUID();
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));

        // workId diferente do work do capítulo
        assertThatThrownBy(() ->
                readingProgressService.trackPageRead(userId.toString(), otherWorkId.toString(), chapterId.toString(), 1, 3)
        ).isInstanceOf(ResourceNotFoundException.class)
         .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    @DisplayName("Deve rejeitar quando o capítulo não existir")
    void shouldRejectWhenChapterNotFound() {
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
                readingProgressService.trackPageRead(userId.toString(), workId.toString(), chapterId.toString(), 1, 3)
        ).isInstanceOf(ResourceNotFoundException.class)
         .hasMessageContaining("Capítulo não encontrado");
    }

    @Test
    @DisplayName("Deve aceitar progresso quando capítulo e contagem de páginas conferem")
    void shouldAcceptValidReadingProgress() {
        when(chapterRepository.findById(chapterId)).thenReturn(Optional.of(chapter));
        when(progressMongoRepository.findByUserIdAndWorkId(userId.toString(), workId.toString()))
                .thenReturn(Optional.empty());
        when(properties.getAds()).thenReturn(new PlatformProperties.Ads());
        when(progressMongoRepository.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var result = readingProgressService.trackPageRead(
                userId.toString(), workId.toString(), chapterId.toString(), 1, 3);

        org.assertj.core.api.Assertions.assertThat(result.progress().getPage()).isEqualTo(1);
        org.assertj.core.api.Assertions.assertThat(result.triggerAd()).isFalse();
    }

    @Test
    @DisplayName("Deve rejeitar IDs de obra ou capítulo em formato UUID inválido")
    void shouldRejectInvalidUuidFormat() {
        assertThatThrownBy(() ->
                readingProgressService.trackPageRead(userId.toString(), "id-invalido", chapterId.toString(), 1, 3)
        ).isInstanceOf(IllegalArgumentException.class)
         .hasMessageContaining("Identificador de obra ou capítulo inválido");
    }
}
