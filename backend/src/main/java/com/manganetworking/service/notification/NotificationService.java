package com.manganetworking.service.notification;

import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.NotificationEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.NotificationRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.notification.dto.NotificationPageResponseDto;
import com.manganetworking.service.notification.dto.NotificationResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Central interna de notificações.
 *
 * <p>É persistida e idempotente por {@code (user_id, dedup_key)}. Não é push:
 * permissão do navegador e VAPID continuam dependendo de infraestrutura externa.
 * Eventos de capítulo respeitam o acesso antecipado: antes da liberação pública,
 * só assinantes ativos do criador recebem; o job de liberação notifica os demais
 * favoritos depois, sem duplicar.</p>
 */
@Service
public class NotificationService {

    private static final int MAX_PAGE_SIZE = 50;
    private static final Set<Integer> COMMENT_MILESTONES = Set.of(1, 5, 10, 20, 30, 50, 100);

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final MembershipSubscriptionRepository membershipSubscriptionRepository;
    private final ChapterRepository chapterRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            MembershipSubscriptionRepository membershipSubscriptionRepository,
            ChapterRepository chapterRepository
    ) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.membershipSubscriptionRepository = membershipSubscriptionRepository;
        this.chapterRepository = chapterRepository;
    }

    @Transactional
    public void notifyUser(
            UUID userId,
            String type,
            String title,
            String body,
            String targetUrl,
            String dedupKey
    ) {
        if (userId == null) {
            return;
        }
        notificationRepository.insertIfAbsent(
                UUID.randomUUID(),
                userId,
                type,
                truncate(title, 160),
                truncate(body, 500),
                truncate(targetUrl, 300),
                truncate(dedupKey, 200));
    }

    @Transactional
    public void notifyNewChapter(ChapterEntity chapter) {
        if (chapter == null || chapter.getWork() == null) {
            return;
        }
        WorkEntity work = chapter.getWork();
        if (work.getAuthor() == null || work.getAuthor().getUser() == null) {
            return;
        }
        UUID creatorUserId = work.getAuthor().getUser().getId();
        Set<UUID> recipients = new HashSet<>(userRepository.findUserIdsByFavoriteWork(work.getId()));
        LocalDateTime now = LocalDateTime.now();

        // Antes da liberação pública, só quem tem acesso antecipado (assinante ativo)
        // pode ser avisado. Os demais entram no job de liberação, com a mesma dedup.
        if (chapter.getPublicReleaseAt() != null && chapter.getPublicReleaseAt().isAfter(now)) {
            recipients.retainAll(membershipSubscriptionRepository.findActiveSubscriberIds(
                    work.getAuthor().getId(), now));
        }

        for (UUID recipient : recipients) {
            if (recipient.equals(creatorUserId)) {
                continue;
            }
            notifyUser(
                    recipient,
                    "NEW_CHAPTER",
                    "Novo capítulo de " + work.getTitle(),
                    "Capítulo " + chapter.getChapterNumber()
                            + (chapter.getTitle() == null ? "" : ": " + chapter.getTitle()),
                    "/obra/" + work.getSlug(),
                    "chapter-release:" + chapter.getId());
        }
    }

    @Transactional
    public void notifyCommentReply(
            UUID recipientUserId,
            UUID actorUserId,
            String actorUsername,
            String workSlug,
            UUID commentId,
            Long chapterNumber
    ) {
        if (recipientUserId == null || recipientUserId.equals(actorUserId)) {
            return;
        }
        String target = workSlug == null ? null : "/obra/" + workSlug
                + (chapterNumber == null ? "" : "?capitulo=" + chapterNumber);
        notifyUser(
                recipientUserId,
                "COMMENT_REPLY",
                "Nova resposta no seu comentário",
                "@" + (actorUsername == null ? "leitor" : actorUsername) + " respondeu você.",
                target,
                "comment-reply:" + commentId);
    }

    @Transactional
    public void notifyCommentMilestone(
            UUID commentAuthorId,
            UUID actorUserId,
            String workSlug,
            UUID commentId,
            long likesCount
    ) {
        if (commentAuthorId == null || commentAuthorId.equals(actorUserId)
                || !COMMENT_MILESTONES.contains((int) likesCount)) {
            return;
        }
        notifyUser(
                commentAuthorId,
                "COMMENT_MILESTONE",
                "Seu comentário recebeu " + likesCount + " curtida(s)",
                "O comentário está em alta na obra.",
                workSlug == null ? null : "/obra/" + workSlug,
                "comment-milestone:" + commentId + ":" + likesCount);
    }

    @Transactional(readOnly = true)
    public NotificationPageResponseDto list(UUID userId, int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        Page<NotificationEntity> result = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(userId, PageRequest.of(safePage, safeSize));
        List<NotificationResponseDto> items = result.getContent().stream()
                .map(this::toResponse)
                .toList();
        return new NotificationPageResponseDto(
                items,
                safePage,
                safeSize,
                result.getTotalElements(),
                result.hasNext(),
                unreadCount(userId));
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndReadAtIsNull(userId);
    }

    @Transactional
    public boolean markRead(UUID userId, UUID notificationId) {
        return notificationRepository.markRead(notificationId, userId, LocalDateTime.now()) > 0;
    }

    @Transactional
    public int markAllRead(UUID userId) {
        return notificationRepository.markAllRead(userId, LocalDateTime.now());
    }

    @Transactional
    public long clearRead(UUID userId) {
        return notificationRepository.deleteByUserIdAndReadAtIsNotNull(userId);
    }

    /**
     * Job idempotente: capítulos que viraram públicos nos últimos 10 minutos.
     * A dedup por capítulo/usuário impede notificação dupla com o aviso antecipado.
     */
    @Scheduled(fixedDelay = 300_000)
    @Transactional
    public void notifyRecentlyReleasedChapters() {
        LocalDateTime now = LocalDateTime.now();
        for (ChapterEntity chapter : chapterRepository.findReleasedBetween(now, now.minusMinutes(10))) {
            notifyNewChapter(chapter);
        }
    }

    private NotificationResponseDto toResponse(NotificationEntity notification) {
        return new NotificationResponseDto(
                notification.getId().toString(),
                notification.getType(),
                notification.getTitle(),
                notification.getBody(),
                notification.getTargetUrl(),
                notification.getReadAt() != null,
                notification.getCreatedAt());
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
