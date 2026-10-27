package com.manganetworking.service.work;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CommentReportEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkCommentEntity;
import com.manganetworking.domain.enums.CommentReportStatus;
import com.manganetworking.domain.enums.CommentStatus;
import com.manganetworking.domain.enums.MembershipStatus;
import com.manganetworking.domain.enums.WorkStatus;
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
import com.manganetworking.service.work.dto.CommentPageResponseDto;
import com.manganetworking.service.work.dto.CommentReportResponseDto;
import com.manganetworking.service.work.dto.CreateCommentRequestDto;
import com.manganetworking.service.work.dto.ReportCommentRequestDto;
import com.manganetworking.service.work.dto.WorkCommentResponseDto;
import com.manganetworking.util.SanitizationUtils;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Comentários da obra e do capítulo.
 *
 * <p>Regras de segurança: corpo higienizado no servidor (texto puro, nunca HTML),
 * identidade pela sessão, ownership para editar/excluir, limite de profundidade 1
 * para respostas e limite simples de publicação por minuto. O selo de assinante é
 * calculado no servidor a partir de {@code membership_subscriptions}.</p>
 */
@Service
public class WorkCommentService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_COMMENTS_PER_MINUTE = 5;
    private static final String DELETED_BODY = "[comentário excluído]";
    private static final List<CommentStatus> PUBLIC_STATUSES = List.of(CommentStatus.VISIBLE, CommentStatus.DELETED);

    private final WorkCommentRepository commentRepository;
    private final CommentLikeRepository commentLikeRepository;
    private final CommentReportRepository commentReportRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final UserRepository userRepository;
    private final MembershipSubscriptionRepository membershipSubscriptionRepository;
    private final NotificationService notificationService;

    public WorkCommentService(
            WorkCommentRepository commentRepository,
            CommentLikeRepository commentLikeRepository,
            CommentReportRepository commentReportRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            UserRepository userRepository,
            MembershipSubscriptionRepository membershipSubscriptionRepository,
            NotificationService notificationService
    ) {
        this.commentRepository = commentRepository;
        this.commentLikeRepository = commentLikeRepository;
        this.commentReportRepository = commentReportRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.userRepository = userRepository;
        this.membershipSubscriptionRepository = membershipSubscriptionRepository;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public CommentPageResponseDto listComments(
            UUID workId,
            UUID chapterId,
            int page,
            int size,
            String sort,
            UUID viewerId
    ) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada"));
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
        PageRequest pageable = PageRequest.of(safePage, safeSize);
        Page<WorkCommentEntity> result = "new".equalsIgnoreCase(sort)
                ? commentRepository.findTopLevelNewest(workId, chapterId, pageable)
                : commentRepository.findTopLevelByScore(workId, chapterId, pageable);

        List<WorkCommentEntity> roots = result.getContent();
        List<UUID> rootIds = roots.stream().map(WorkCommentEntity::getId).toList();
        List<WorkCommentEntity> replies = rootIds.isEmpty()
                ? List.of()
                : commentRepository.findByParentIdInAndStatusInOrderByParentIdAscCreatedAtAscIdAsc(
                        rootIds, PUBLIC_STATUSES);

        List<WorkCommentEntity> all = new ArrayList<>(roots.size() + replies.size());
        all.addAll(roots);
        all.addAll(replies);

        Set<UUID> authorIds = all.stream()
                .map(comment -> comment.getUser().getId())
                .collect(Collectors.toSet());
        Map<UUID, UserEntity> authors = userRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(UserEntity::getId, Function.identity()));

        Set<UUID> subscriberIds = activeSubscriberIds(work);
        Set<UUID> likedIds = likedCommentIds(viewerId, all);
        Map<UUID, Long> replyCounts = replyCounts(rootIds);

        Map<UUID, List<WorkCommentEntity>> repliesByParent = replies.stream()
                .collect(Collectors.groupingBy(
                        reply -> reply.getParent().getId(),
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<WorkCommentResponseDto> items = roots.stream()
                .map(root -> toResponse(
                        root,
                        viewerId,
                        authors,
                        subscriberIds,
                        likedIds,
                        replyCounts.getOrDefault(root.getId(), 0L),
                        repliesByParent.getOrDefault(root.getId(), List.of()).stream()
                                .map(reply -> toResponse(
                                        reply,
                                        viewerId,
                                        authors,
                                        subscriberIds,
                                        likedIds,
                                        0L,
                                        List.of()))
                                .toList()))
                .toList();

        long total = chapterId == null
                ? commentRepository.countByWorkIdAndParentIsNullAndStatusIn(workId, PUBLIC_STATUSES)
                : commentRepository.countByWorkIdAndChapterIdAndParentIsNullAndStatusIn(
                        workId, chapterId, PUBLIC_STATUSES);
        boolean hasMore = (long) (safePage + 1) * safeSize < total;
        return new CommentPageResponseDto(items, safePage, safeSize, total, hasMore);
    }

    @Transactional
    public WorkCommentResponseDto createComment(
            UUID userId,
            UUID workId,
            UUID chapterId,
            UUID parentId,
            String rawBody
    ) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada"));

        if (work.getStatus() == null || !work.getStatus().isPublic()) {
            throw new IllegalArgumentException("Esta obra ainda nÃ£o estÃ¡ disponÃ­vel para comentÃ¡rios.");
        }

        ChapterEntity chapter = null;
        if (chapterId != null) {
            chapter = chapterRepository.findById(chapterId)
                    .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado"));
            if (chapter.getWork() == null || !chapter.getWork().getId().equals(workId)) {
                throw new ResourceNotFoundException("Capítulo não pertence a esta obra.");
            }
        }

        WorkCommentEntity parent = null;
        if (parentId != null) {
            parent = commentRepository.findByIdAndWorkId(parentId, workId)
                    .orElseThrow(() -> new ResourceNotFoundException("Comentário não encontrado"));
            if (!parent.isVisible()) {
                throw new IllegalArgumentException("Não é possível responder a um comentário excluído.");
            }
            if (parent.getParent() != null) {
                throw new IllegalArgumentException("Respostas são permitidas apenas em comentários de primeiro nível.");
            }
            UUID parentChapterId = parent.getChapter() != null ? parent.getChapter().getId() : null;
            UUID targetChapterId = chapter != null ? chapter.getId() : null;
            if (!Objects.equals(parentChapterId, targetChapterId)) {
                throw new IllegalArgumentException("A resposta precisa estar no mesmo capítulo do comentário original.");
            }
        }

        LocalDateTime oneMinuteAgo = LocalDateTime.now().minusMinutes(1);
        if (commentRepository.countByUserIdAndCreatedAtAfter(userId, oneMinuteAgo) >= MAX_COMMENTS_PER_MINUTE) {
            throw new IllegalArgumentException("Muitos comentários em pouco tempo. Aguarde um minuto.");
        }

        String body = sanitizeBody(rawBody);
        UserEntity author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        WorkCommentEntity comment = new WorkCommentEntity();
        comment.setWork(work);
        comment.setChapter(chapter);
        comment.setParent(parent);
        comment.setUser(author);
        comment.setBody(body);
        commentRepository.save(comment);

        workRepository.incrementTotalComments(workId);
        if (chapter != null) {
            chapterRepository.incrementCommentsCount(chapter.getId());
        }

        if (parent != null) {
            notificationService.notifyCommentReply(
                    parent.getUser().getId(),
                    userId,
                    author.getUsername(),
                    work.getSlug(),
                    comment.getId(),
                    chapter != null ? chapter.getChapterNumber().longValue() : null);
        }

        boolean subscriber = isActiveSubscriber(userId, work);
        return toResponse(comment, userId, Map.of(userId, author), subscriber ? Set.of(userId) : Set.of(),
                Set.of(), 0L, List.of());
    }

    @Transactional
    public WorkCommentResponseDto editComment(UUID userId, UUID workId, UUID commentId, String rawBody) {
        WorkCommentEntity comment = ownedComment(userId, workId, commentId);
        if (!comment.isVisible()) {
            throw new IllegalArgumentException("Comentário excluído não pode ser editado.");
        }
        comment.setBody(sanitizeBody(rawBody));
        comment.setEditedAt(LocalDateTime.now());
        commentRepository.save(comment);
        return toResponse(comment, userId, Map.of(), Set.of(), Set.of(), 0L, List.of());
    }

    @Transactional
    public void deleteComment(UUID userId, UUID workId, UUID commentId) {
        WorkCommentEntity comment = ownedComment(userId, workId, commentId);
        if (!comment.isVisible()) {
            return;
        }
        boolean hasVisibleReplies = commentRepository
                .countByParentIdAndStatus(commentId, CommentStatus.VISIBLE) > 0;
        if (hasVisibleReplies) {
            // Preserva a conversa: o comentário raiz vira um marcador e as respostas continuam.
            comment.setStatus(CommentStatus.DELETED);
            comment.setBody(DELETED_BODY);
            comment.setDeletedAt(LocalDateTime.now());
            commentRepository.save(comment);
        } else {
            // Folha ou raiz sem respostas: apaga de verdade, sem deixar marcador órfão.
            WorkCommentEntity parent = comment.getParent();
            commentRepository.delete(comment);
            if (parent != null && !parent.isVisible()
                    && commentRepository.countByParentIdAndStatus(parent.getId(), CommentStatus.VISIBLE) == 0) {
                commentRepository.delete(parent);
            }
        }
        decrementCommentCounters(comment);
    }

    @Transactional
    public CommentLikeResponseDto toggleLike(UUID userId, UUID workId, UUID commentId) {
        WorkCommentEntity comment = commentRepository.findByIdAndWorkId(commentId, workId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentário não encontrado"));
        if (!comment.isVisible()) {
            throw new IllegalArgumentException("Não é possível curtir um comentário excluído.");
        }

        int inserted = commentLikeRepository.insertIfAbsent(UUID.randomUUID(), userId, commentId);
        boolean liked;
        if (inserted == 1) {
            commentRepository.incrementLikes(commentId);
            liked = true;
        } else {
            commentLikeRepository.deleteByUser_IdAndComment_Id(userId, commentId);
            commentRepository.decrementLikes(commentId);
            liked = false;
        }
        Long count = commentRepository.findLikesCount(commentId);
        long likesCount = count == null ? 0L : count;
        if (liked) {
            notificationService.notifyCommentMilestone(
                    comment.getUser() != null ? comment.getUser().getId() : null,
                    userId,
                    comment.getWork() != null ? comment.getWork().getSlug() : null,
                    commentId,
                    likesCount);
        }
        return new CommentLikeResponseDto(liked, likesCount);
    }

    @Transactional
    public CommentReportResponseDto reportComment(
            UUID reporterId,
            UUID workId,
            UUID commentId,
            ReportCommentRequestDto request
    ) {
        WorkCommentEntity comment = commentRepository.findByIdAndWorkId(commentId, workId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentário não encontrado"));
        if (!comment.isVisible()) {
            throw new IllegalArgumentException("Este comentário não está disponível para denúncia.");
        }
        if (comment.getUser() != null && comment.getUser().getId().equals(reporterId)) {
            throw new IllegalArgumentException("Não é possível denunciar o próprio comentário.");
        }
        if (commentReportRepository.existsByComment_IdAndReporter_Id(commentId, reporterId)) {
            throw new IllegalArgumentException("Você já denunciou este comentário.");
        }

        UserEntity reporter = userRepository.findById(reporterId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
        String reason = sanitizeShortText(request.reason(), 40);
        if (reason.isBlank()) {
            throw new IllegalArgumentException("Informe o motivo da denúncia.");
        }
        String details = request.details() == null ? null : sanitizeShortText(request.details(), 500);

        CommentReportEntity report = new CommentReportEntity();
        report.setComment(comment);
        report.setReporter(reporter);
        report.setReason(reason);
        report.setDetails(details == null || details.isBlank() ? null : details);
        commentReportRepository.save(report);
        return toReportResponse(report);
    }

    @Transactional(readOnly = true)
    public List<CommentReportResponseDto> listPendingReports() {
        return commentReportRepository
                .findAllByStatusOrderByCreatedAtAsc(CommentReportStatus.PENDING, PageRequest.of(0, 100))
                .stream()
                .map(this::toReportResponse)
                .toList();
    }

    @Transactional
    public void moderateReport(UUID reportId, String action, String notes) {
        CommentReportEntity report = commentReportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Denúncia não encontrada"));
        if (report.getStatus() != CommentReportStatus.PENDING) {
            throw new IllegalArgumentException("Esta denúncia já foi analisada.");
        }
        String normalized = action == null ? "" : action.trim().toUpperCase();
        if (!"DISMISS".equals(normalized) && !"HIDE".equals(normalized)) {
            throw new IllegalArgumentException("Ação inválida. Use DISMISS ou HIDE.");
        }

        if ("HIDE".equals(normalized)) {
            WorkCommentEntity comment = report.getComment();
            if (comment != null && comment.isVisible()) {
                comment.setStatus(CommentStatus.HIDDEN);
                comment.setBody(DELETED_BODY);
                comment.setDeletedAt(LocalDateTime.now());
                commentRepository.save(comment);
                decrementCommentCounters(comment);
            }
            report.setStatus(CommentReportStatus.RESOLVED);
        } else {
            report.setStatus(CommentReportStatus.DISMISSED);
        }
        report.setResolutionNotes(notes == null ? null : sanitizeShortText(notes, 500));
        report.setResolvedAt(LocalDateTime.now());
        commentReportRepository.save(report);
    }

    private WorkCommentEntity ownedComment(UUID userId, UUID workId, UUID commentId) {
        WorkCommentEntity comment = commentRepository.findByIdAndWorkId(commentId, workId)
                .orElseThrow(() -> new ResourceNotFoundException("Comentário não encontrado"));
        if (comment.getUser() == null || !comment.getUser().getId().equals(userId)) {
            throw new com.manganetworking.config.exception.AccessDeniedException(
                    "Você só pode alterar os próprios comentários.");
        }
        return comment;
    }

    private void decrementCommentCounters(WorkCommentEntity comment) {
        if (comment.getWork() != null) {
            workRepository.decrementTotalComments(comment.getWork().getId());
        }
        if (comment.getChapter() != null) {
            chapterRepository.decrementCommentsCount(comment.getChapter().getId());
        }
    }

    private String sanitizeBody(String rawBody) {
        String body = SanitizationUtils.stripAllHtml(rawBody == null ? "" : rawBody.trim());
        if (body.isBlank()) {
            throw new IllegalArgumentException("O comentário não pode ficar em branco.");
        }
        if (body.length() > CreateCommentRequestDto.MAX_LENGTH) {
            throw new IllegalArgumentException(
                    "O comentário deve ter no máximo " + CreateCommentRequestDto.MAX_LENGTH + " caracteres.");
        }
        return body;
    }

    private String sanitizeShortText(String raw, int maxLength) {
        String value = SanitizationUtils.stripAllHtml(raw == null ? "" : raw.trim());
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    private Set<UUID> activeSubscriberIds(WorkEntity work) {
        if (work.getAuthor() == null) {
            return Set.of();
        }
        return membershipSubscriptionRepository.findActiveSubscriberIds(
                work.getAuthor().getId(), LocalDateTime.now());
    }

    private boolean isActiveSubscriber(UUID userId, WorkEntity work) {
        if (work.getAuthor() == null) {
            return false;
        }
        return membershipSubscriptionRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                userId, work.getAuthor().getId(), MembershipStatus.ACTIVE, LocalDateTime.now());
    }

    private Set<UUID> likedCommentIds(UUID viewerId, Collection<WorkCommentEntity> comments) {
        if (viewerId == null || comments.isEmpty()) {
            return Set.of();
        }
        return commentLikeRepository.findLikedCommentIds(
                viewerId, comments.stream().map(WorkCommentEntity::getId).toList());
    }

    private Map<UUID, Long> replyCounts(Collection<UUID> parentIds) {
        if (parentIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, Long> counts = new LinkedHashMap<>();
        for (Object[] row : commentRepository.countVisibleRepliesByParentIds(parentIds)) {
            counts.put((UUID) row[0], (Long) row[1]);
        }
        return counts;
    }

    private WorkCommentResponseDto toResponse(
            WorkCommentEntity comment,
            UUID viewerId,
            Map<UUID, UserEntity> authors,
            Set<UUID> subscriberIds,
            Set<UUID> likedIds,
            long replyCount,
            List<WorkCommentResponseDto> replies
    ) {
        UserEntity author = comment.getUser();
        UUID authorId = author != null ? author.getId() : null;
        UserEntity loaded = authorId != null ? authors.getOrDefault(authorId, author) : author;
        boolean profilePublic = loaded != null && loaded.isProfilePublic();
        boolean deleted = !comment.isVisible();
        return new WorkCommentResponseDto(
                comment.getId() != null ? comment.getId().toString() : "",
                comment.getParent() != null ? comment.getParent().getId().toString() : null,
                loaded != null ? loaded.getUsername() : "",
                profilePublic && loaded != null ? loaded.getName() : null,
                profilePublic && loaded != null ? loaded.getAvatarUrl() : null,
                profilePublic,
                loaded != null && loaded.isCreator(),
                authorId != null && subscriberIds.contains(authorId),
                deleted ? DELETED_BODY : comment.getBody(),
                comment.getLikesCount() == null ? 0L : comment.getLikesCount(),
                replyCount,
                authorId != null && likedIds.contains(comment.getId()),
                authorId != null && authorId.equals(viewerId),
                comment.getEditedAt() != null,
                deleted,
                comment.getCreatedAt(),
                comment.getEditedAt(),
                replies);
    }

    private CommentReportResponseDto toReportResponse(CommentReportEntity report) {
        WorkCommentEntity comment = report.getComment();
        return new CommentReportResponseDto(
                report.getId() != null ? report.getId().toString() : "",
                comment != null && comment.getId() != null ? comment.getId().toString() : "",
                comment != null && comment.getWork() != null ? comment.getWork().getId().toString() : "",
                comment != null ? comment.getBody() : "",
                report.getReporter() != null ? report.getReporter().getUsername() : "",
                report.getReason(),
                report.getDetails(),
                report.getStatus() != null ? report.getStatus().name() : null,
                report.getCreatedAt());
    }
}
