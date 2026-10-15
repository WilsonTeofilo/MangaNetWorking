package com.manganetworking.service.work;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.work.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class WorkApplicationService {

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final MembershipSubscriptionRepository membershipRepository;

    public WorkApplicationService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            MembershipSubscriptionRepository membershipRepository
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.membershipRepository = membershipRepository;
    }

    @Transactional(readOnly = true)
    public WorkDetailsResponseDto getWorkBySlug(String slug) {
        WorkEntity work = workRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + slug));

        List<ChapterEntity> chapters = chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId());
        CreatorEntity author = work.getAuthor();

        List<ChapterSummaryDto> chaptersDto = chapters.stream()
                .map(cap -> new ChapterSummaryDto(
                        cap.getId(),
                        cap.getChapterNumber(),
                        cap.getTitle(),
                        cap.getCoverUrl(),
                        cap.getPublicReleaseAt(),
                        cap.isEarlyAccessForMembers(),
                        cap.getViews(),
                        cap.getLikes()
                ))
                .toList();

        AuthorSummaryDto authorDto = null;
        if (author != null) {
            authorDto = new AuthorSummaryDto(
                    author.getId(),
                    author.getUser() != null ? author.getUser().getName() : author.getHandle(),
                    "@" + author.getHandle(),
                    author.getAvatarUrl(),
                    author.getMembershipPriceBrl(),
                    author.isMonetizationUnlocked()
            );
        }

        return new WorkDetailsResponseDto(
                work.getId(),
                work.getTitle(),
                work.getSlug(),
                work.getOriginalTitle(),
                work.getSynopsis(),
                work.getCoverUrl(),
                work.getBannerUrl(),
                work.getStatus(),
                work.getGenres(),
                work.getTotalChapters(),
                work.getTotalViews(),
                work.getTotalLikes(),
                authorDto,
                chaptersDto
        );
    }

    @Transactional
    public ChapterReadResponseDto readChapter(String slug, Integer chapterNumber, UUID currentUserId) {
        WorkEntity work = workRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + slug));

        ChapterEntity chapter = chapterRepository.findByWorkIdAndChapterNumber(work.getId(), chapterNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo #" + chapterNumber + " não encontrado na obra " + slug));

        CreatorEntity author = work.getAuthor();
        boolean isEarlyAccess = chapter.isEarlyAccessForMembers();

        if (isEarlyAccess) {
            boolean isMember = false;
            if (currentUserId != null && author != null) {
                isMember = membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                        currentUserId, author.getId(), "ACTIVE", LocalDateTime.now()
                );
            }

            if (!isMember) {
                throw new AccessDeniedException(
                        "Capítulo em Acesso Antecipado exclusivo para membros oficiais do autor @" +
                                (author != null ? author.getHandle() : "")
                );
            }
        }

        // Capítulo Liberado: Incrementa métricas de visualização
        chapter.setViews(chapter.getViews() + 1);
        work.setTotalViews(work.getTotalViews() + 1);
        chapterRepository.save(chapter);
        workRepository.save(work);

        return new ChapterReadResponseDto(
                false,
                chapter.getId(),
                work.getTitle(),
                chapter.getChapterNumber(),
                chapter.getTitle(),
                chapter.getPagesJson(),
                chapter.getLikes(),
                author != null ? "@" + author.getHandle() : "",
                author != null ? author.getId() : null
        );
    }
}
