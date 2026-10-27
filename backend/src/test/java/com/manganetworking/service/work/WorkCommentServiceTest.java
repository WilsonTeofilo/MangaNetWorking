package com.manganetworking.service.work;
import com.manganetworking.domain.enums.CommentStatus;
import com.manganetworking.domain.enums.WorkStatus;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkCommentEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CommentLikeRepository;
import com.manganetworking.repository.jpa.CommentReportRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkCommentRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.notification.NotificationService;
import com.manganetworking.service.work.dto.CommentLikeResponseDto;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkCommentServiceTest {

    @Mock private WorkCommentRepository commentRepository;
    @Mock private CommentLikeRepository commentLikeRepository;
    @Mock private CommentReportRepository commentReportRepository;
    @Mock private WorkRepository workRepository;
    @Mock private ChapterRepository chapterRepository;
    @Mock private UserRepository userRepository;
    @Mock private MembershipSubscriptionRepository membershipSubscriptionRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private WorkCommentService service;

    private UUID userId;
    private UUID workId;
    private UUID commentId;
    private WorkEntity work;
    private UserEntity owner;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        workId = UUID.randomUUID();
        commentId = UUID.randomUUID();

        work = new WorkEntity();
        work.setId(workId);
        work.setTitle("Obra");
        work.setSlug("obra");
        work.setStatus(WorkStatus.ONGOING);

        owner = new UserEntity();
        owner.setId(userId);
        owner.setUsername("leitor");
        owner.setName("Leitor");
        owner.setProfilePublic(true);
    }

    @Test
    @DisplayName("resposta a resposta é recusada para manter profundidade 1")
    void shouldRejectReplyToReply() {
        WorkCommentEntity parent = new WorkCommentEntity();
        parent.setId(UUID.randomUUID());
        parent.setWork(work);
        parent.setUser(owner);
        parent.setBody("raiz");
        WorkCommentEntity grandParent = new WorkCommentEntity();
        grandParent.setId(UUID.randomUUID());
        parent.setParent(grandParent);

        when(workRepository.findById(workId)).thenReturn(Optional.of(work));
        when(commentRepository.findByIdAndWorkId(parent.getId(), workId)).thenReturn(Optional.of(parent));

        assertThatThrownBy(() -> service.createComment(
                userId, workId, null, parent.getId(), "resposta"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("primeiro nível");
        verify(commentRepository, never()).save(any());
    }

    @Test
    @DisplayName("exclusão é lógica e decrementa os contadores da obra e do capítulo")
    void shouldSoftDeleteAndDecrementCounters() {
        ChapterEntity chapter = new ChapterEntity();
        chapter.setId(UUID.randomUUID());
        chapter.setWork(work);

        WorkCommentEntity comment = new WorkCommentEntity();
        comment.setId(commentId);
        comment.setWork(work);
        comment.setChapter(chapter);
        comment.setUser(owner);
        comment.setBody("comentário");
        comment.setStatus(CommentStatus.VISIBLE);

        when(commentRepository.findByIdAndWorkId(commentId, workId)).thenReturn(Optional.of(comment));
        when(commentRepository.countByParentIdAndStatus(commentId, CommentStatus.VISIBLE)).thenReturn(1L);

        service.deleteComment(userId, workId, commentId);

        assertThat(comment.getStatus()).isEqualTo(CommentStatus.DELETED);
        assertThat(comment.getBody()).isEqualTo("[comentário excluído]");
        assertThat(comment.getDeletedAt()).isNotNull();
        verify(workRepository).decrementTotalComments(workId);
        verify(chapterRepository).decrementCommentsCount(chapter.getId());
    }

    @Test
    @DisplayName("comentário sem respostas é apagado de verdade, sem deixar marcador órfão")
    void shouldHardDeleteLeafWithoutReplies() {
        WorkCommentEntity comment = new WorkCommentEntity();
        comment.setId(commentId);
        comment.setWork(work);
        comment.setUser(owner);
        comment.setBody("comentário");
        comment.setStatus(CommentStatus.VISIBLE);

        when(commentRepository.findByIdAndWorkId(commentId, workId)).thenReturn(Optional.of(comment));
        when(commentRepository.countByParentIdAndStatus(commentId, CommentStatus.VISIBLE)).thenReturn(0L);

        service.deleteComment(userId, workId, commentId);

        verify(commentRepository).delete(comment);
        verify(workRepository).decrementTotalComments(workId);
    }

    @Test
    @DisplayName("curtida insere uma vez, incrementa e avisa o marco ao autor")
    void shouldToggleLikeAndNotifyMilestone() {
        WorkCommentEntity comment = new WorkCommentEntity();
        comment.setId(commentId);
        comment.setWork(work);
        comment.setUser(owner);
        comment.setBody("comentário");
        comment.setStatus(CommentStatus.VISIBLE);
        comment.setLikesCount(5L);

        when(commentRepository.findByIdAndWorkId(commentId, workId)).thenReturn(Optional.of(comment));
        when(commentLikeRepository.insertIfAbsent(any(), any(), any())).thenReturn(1);
        when(commentRepository.findLikesCount(commentId)).thenReturn(5L);

        UUID actorId = UUID.randomUUID();
        CommentLikeResponseDto result = service.toggleLike(actorId, workId, commentId);

        assertThat(result.liked()).isTrue();
        assertThat(result.likesCount()).isEqualTo(5L);
        verify(commentRepository).incrementLikes(commentId);
        verify(notificationService).notifyCommentMilestone(
                owner.getId(), actorId, "obra", commentId, 5L);
    }

    @Test
    @DisplayName("outro usuário não edita comentário de terceiro")
    void shouldRejectEditingAnotherUsersComment() {
        WorkCommentEntity comment = new WorkCommentEntity();
        comment.setId(commentId);
        comment.setWork(work);
        comment.setUser(owner);
        comment.setBody("comentário");
        comment.setStatus(CommentStatus.VISIBLE);

        when(commentRepository.findByIdAndWorkId(commentId, workId)).thenReturn(Optional.of(comment));

        assertThatThrownBy(() -> service.editComment(UUID.randomUUID(), workId, commentId, "novo"))
                .isInstanceOf(AccessDeniedException.class);
        verify(commentRepository, never()).save(any());
    }
}
