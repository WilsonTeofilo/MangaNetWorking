package com.manganetworking.service.work;

import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.domain.enums.WorkStatus;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedRemovalEvent;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.work.dto.*;
import com.manganetworking.util.SanitizationUtils;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class WorkApplicationService {



    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final CreatorRepository creatorRepository;
    private final ApplicationEventPublisher eventPublisher;

    public WorkApplicationService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            CreatorRepository creatorRepository,
            ApplicationEventPublisher eventPublisher
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.creatorRepository = creatorRepository;
        this.eventPublisher = eventPublisher;
    }

    private boolean isAuthorOrModerator(WorkEntity work, UUID currentUserId) {
        if (currentUserId == null || work == null) {
            return false;
        }
        if (work.getAuthor() != null
                && work.getAuthor().getUser() != null
                && currentUserId.equals(work.getAuthor().getUser().getId())) {
            return true;
        }
        return SecurityContextUtils.getCurrentSession()
                .map(session -> session.isModerator())
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public WorkDetailsResponseDto getWorkBySlug(String slug, UUID currentUserId) {
        WorkEntity work = workRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + slug));

        assertWorkVisible(work);

        List<ChapterEntity> chapters = chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId());
        CreatorEntity author = work.getAuthor();
        LocalDateTime now = LocalDateTime.now();

        boolean privilegedViewer = isAuthorOrModerator(work, currentUserId);
        boolean workIsPublic = work.getStatus() != null && work.getStatus().isPublic();
        List<ChapterSummaryDto> chaptersDto = chapters.stream()
                .filter(chapter -> privilegedViewer
                        || workIsPublic
                        || (chapter.getPublicReleaseAt() != null
                        && !chapter.getPublicReleaseAt().isAfter(now)))
                .map(cap -> new ChapterSummaryDto(
                        cap.getId(),
                        cap.getChapterNumber(),
                        cap.getTitle(),
                        cap.getCoverUrl(),
                        cap.getPublicReleaseAt(),
                        cap.isEarlyAccessForMembers(),
                        cap.getViews() != null ? cap.getViews() : 0L,
                        cap.getLikes() != null ? cap.getLikes() : 0L,
                        cap.getFormat()
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
                work.getStatus() != null ? work.getStatus().name() : null,
                work.getFormat(),
                work.getGenres(),
                work.getTotalChapters(),
                work.getTotalViews(),
                work.getTotalLikes(),
                work.getTotalFavorites(),
                authorDto,
                chaptersDto
        );
    }

    @Transactional(readOnly = true)
    public List<CreatorWorkSummaryResponseDto> listCreatorWorks(UUID creatorId) {
        return workRepository.findAllByAuthorId(creatorId).stream()
                .map(work -> new CreatorWorkSummaryResponseDto(
                        work.getId(),
                        work.getTitle(),
                        work.getSlug(),
                        work.getSynopsis(),
                        work.getCoverUrl(),
                        work.getBannerUrl(),
                        work.getStatus() != null ? work.getStatus().name() : null,
                        work.getFormat() != null ? work.getFormat().name() : null,
                        work.getTotalChapters(),
                        work.getTotalViews(),
                        work.getTotalLikes(),
                        work.getTotalFavorites()))
                .sorted(Comparator.comparing(CreatorWorkSummaryResponseDto::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public void deleteWork(UUID creatorId, UUID workId) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra nao encontrada"));
        if (work.getAuthor() == null || !creatorId.equals(work.getAuthor().getId())) {
            throw new AccessDeniedException("Apenas o autor da obra pode remove-la.");
        }
        workRepository.delete(work);
        eventPublisher.publishEvent(new WorkFeedRemovalEvent(workId));
    }

    @Transactional
    public WorkDetailsResponseDto updateWork(UUID creatorId, UUID workId, UpdateWorkRequestDto dto) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada"));
        if (work.getAuthor() == null || !creatorId.equals(work.getAuthor().getId())) {
            throw new AccessDeniedException("Apenas o autor da obra pode alterá-la.");
        }

        work.setTitle(SanitizationUtils.stripAllHtml(dto.title().trim()));
        work.setSynopsis(SanitizationUtils.sanitizeText(dto.synopsis().trim()));
        work.setCoverUrl(WorkImageUrlPolicy.cover(dto.coverUrl()));
        work.setBannerUrl(dto.bannerUrl() != null && !dto.bannerUrl().isBlank()
                ? WorkImageUrlPolicy.banner(dto.bannerUrl())
                : null);
        if (dto.genres() != null && !dto.genres().isEmpty()) {
            work.setGenres(new ArrayList<>(dto.genres()));
        }
        if (dto.format() != null) {
            work.setFormat(dto.format());
        }
        if (dto.status() != null && !dto.status().isBlank()) {
            work.setStatus(normalizeWorkStatus(dto.status()));
        }

        WorkEntity saved = workRepository.save(work);
        publishFeedSync(saved.getId(), "atualizacao");
        return toDetailsDto(saved);
    }

    @Transactional
    public WorkDetailsResponseDto createWork(UUID creatorId, CreateWorkRequestDto dto) {
        if (!dto.originalAuthorDeclaration()) {
            throw new IllegalArgumentException("É obrigatório declarar a autoria original da obra.");
        }

        CreatorEntity author = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado: " + creatorId));

        String baseSlug = dto.title().trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");

        if (baseSlug.isBlank()) {
            baseSlug = "obra-" + UUID.randomUUID().toString().substring(0, 8);
        }

        String finalSlug = baseSlug;
        if (workRepository.findBySlug(finalSlug).isPresent()) {
            finalSlug = baseSlug + "-" + UUID.randomUUID().toString().substring(0, 6);
        }

        String safeTitle = SanitizationUtils.stripAllHtml(dto.title().trim());
        String safeSynopsis = SanitizationUtils.sanitizeText(dto.synopsis().trim());
        String safeOriginalTitle = dto.originalTitle() != null ? SanitizationUtils.stripAllHtml(dto.originalTitle().trim()) : null;

        WorkEntity work = new WorkEntity();
        work.setAuthor(author);
        work.setTitle(safeTitle);
        work.setSlug(finalSlug);
        work.setOriginalTitle(safeOriginalTitle);
        work.setSynopsis(safeSynopsis);
        work.setCoverUrl(dto.coverUrl().trim());
        work.setBannerUrl(dto.bannerUrl() != null ? dto.bannerUrl().trim() : null);
        work.setGenres(dto.genres());
        work.setFormat(dto.format());
        work.setStatus(WorkStatus.ONGOING);

        WorkEntity saved = workRepository.save(work);
        publishFeedSync(saved.getId(), "cadastro");
        return toDetailsDto(saved);
    }

    private WorkDetailsResponseDto toDetailsDto(WorkEntity work) {
        AuthorSummaryDto authorDto = null;
        CreatorEntity author = work.getAuthor();
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
                work.getStatus() != null ? work.getStatus().name() : null,
                work.getFormat(),
                work.getGenres(),
                work.getTotalChapters(),
                work.getTotalViews(),
                work.getTotalLikes(),
                work.getTotalFavorites(),
                authorDto,
                List.of()
        );
    }

    private WorkStatus normalizeWorkStatus(String status) {
        if (status == null || status.isBlank()) {
            return WorkStatus.ONGOING;
        }
        return WorkStatus.fromString(status);
    }

    private void assertWorkVisible(WorkEntity work) {
        if (work != null && work.getStatus() == WorkStatus.ARCHIVED_LGPD) {
            throw new ResourceNotFoundException("Obra não encontrada.");
        }
        if (work == null || work.getStatus() != WorkStatus.SUSPENDED) {
            return;
        }

        SessionService.UserSession session = SecurityContextUtils.getCurrentSession().orElse(null);
        boolean isModerator = session != null && session.isModerator();
        UUID sessionCreatorId = session != null ? session.creatorId() : null;
        boolean isAuthor = sessionCreatorId != null && work.getAuthor() != null
                && sessionCreatorId.equals(work.getAuthor().getId());

        if (!isAuthor && !isModerator) {
            throw new AccessDeniedException("Esta obra está suspensa cautelarmente e indisponível.");
        }
    }

    private void publishFeedSync(UUID workId, String context) {
        eventPublisher.publishEvent(new WorkFeedSyncEvent(workId, context));
    }
}
