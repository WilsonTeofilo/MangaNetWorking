package com.manganetworking.service.work;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterLikeRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.user.dto.ToggleLikeResponseDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("ChapterLikeService - curtida do capítulo")
class ChapterLikeServiceTest {

    @Mock
    private ChapterLikeRepository chapterLikeRepository;
    @Mock
    private ChapterRepository chapterRepository;
    @Mock
    private WorkRepository workRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ChapterLikeService service;

    private UUID userId;
    private UUID workId;
    private UUID chapterId;
    private ChapterEntity chapter;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        workId = UUID.randomUUID();
        chapterId = UUID.randomUUID();
        chapter = new ChapterEntity();
        chapter.setId(chapterId);
        chapter.setChapterNumber(1);
        chapter.setTitle("Capítulo 1");
        chapter.setPagesJson("[\"p1\"]");
        WorkEntity work = new WorkEntity();
        work.setId(workId);
        chapter.setWork(work);
    }

    @Test
    @DisplayName("Curtir capítulo insere uma linha e incrementa uma vez")
    void shouldInsertAndIncrement() {
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.of(chapter));
        when(userRepository.existsById(userId)).thenReturn(true);
        when(chapterLikeRepository.existsByUser_IdAndChapter_Id(userId, chapterId)).thenReturn(false);
        when(chapterLikeRepository.insertIfAbsent(any(), any(), any())).thenReturn(1);
        when(chapterRepository.findLikes(chapterId)).thenReturn(1L);

        ToggleLikeResponseDto result = service.toggle(userId, workId, 1);

        assertThat(result.liked()).isTrue();
        assertThat(result.totalLikes()).isEqualTo(1L);
        verify(chapterRepository).incrementLikes(chapterId);
        verify(workRepository).incrementTotalLikes(workId);
    }

    @Test
    @DisplayName("Descurtir capítulo remove a linha e decrementa")
    void shouldDeleteAndDecrement() {
        when(chapterRepository.findByWorkIdAndChapterNumber(workId, 1)).thenReturn(Optional.of(chapter));
        when(userRepository.existsById(userId)).thenReturn(true);
        when(chapterLikeRepository.existsByUser_IdAndChapter_Id(userId, chapterId)).thenReturn(true);
        when(chapterLikeRepository.deleteByUserAndChapter(userId, chapterId)).thenReturn(1);
        when(chapterRepository.findLikes(chapterId)).thenReturn(0L);

        ToggleLikeResponseDto result = service.toggle(userId, workId, 1);

        assertThat(result.liked()).isFalse();
        verify(chapterRepository).decrementLikes(chapterId);
        verify(workRepository).decrementTotalLikes(workId);
    }

    @Test
    @DisplayName("Capítulo de outra obra não é curtido")
    void shouldRejectChapterFromAnotherWork() {
        UUID otherWork = UUID.randomUUID();
        when(chapterRepository.findByWorkIdAndChapterNumber(otherWork, 1)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.toggle(userId, otherWork, 1))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(chapterLikeRepository, never()).insertIfAbsent(any(), any(), any());
    }
}
