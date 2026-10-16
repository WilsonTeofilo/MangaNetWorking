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

import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.repository.jpa.CreatorRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class WorkApplicationService {

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final MembershipSubscriptionRepository membershipRepository;
    private final CreatorRepository creatorRepository;
    private final ObjectMapper objectMapper;

    public WorkApplicationService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            MembershipSubscriptionRepository membershipRepository,
            CreatorRepository creatorRepository,
            ObjectMapper objectMapper
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.membershipRepository = membershipRepository;
        this.creatorRepository = creatorRepository;
        this.objectMapper = objectMapper;
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

    /**
     * Cadastro de nova obra pelo autor com declaração obrigatória de autoria original
     */
    @Transactional
    public WorkEntity createWork(UUID creatorId, CreateWorkRequestDto dto) {
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

        WorkEntity work = new WorkEntity();
        work.setAuthor(author);
        work.setTitle(dto.title().trim());
        work.setSlug(finalSlug);
        work.setOriginalTitle(dto.originalTitle() != null ? dto.originalTitle().trim() : null);
        work.setSynopsis(dto.synopsis().trim());
        work.setCoverUrl(dto.coverUrl().trim());
        work.setBannerUrl(dto.bannerUrl() != null ? dto.bannerUrl().trim() : null);
        work.setGenres(dto.genres());
        work.setStatus("ongoing");

        return workRepository.save(work);
    }

    /**
     * Publicação de novo capítulo com agendamento de liberação pública
     */
    @Transactional
    public ChapterEntity createChapter(UUID creatorId, UUID workId, CreateChapterRequestDto dto) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + workId));

        if (!work.getAuthor().getId().equals(creatorId)) {
            throw new AccessDeniedException("Apenas o autor proprietário pode publicar capítulos nesta obra.");
        }

        if (chapterRepository.findByWorkIdAndChapterNumber(workId, dto.chapterNumber()).isPresent()) {
            throw new IllegalArgumentException("Capítulo #" + dto.chapterNumber() + " já está cadastrado nesta obra.");
        }

        String pagesJson;
        try {
            pagesJson = objectMapper.writeValueAsString(dto.pages());
        } catch (Exception e) {
            throw new IllegalArgumentException("Erro ao serializar páginas do capítulo: " + e.getMessage());
        }

        ChapterEntity chapter = new ChapterEntity();
        chapter.setWork(work);
        chapter.setChapterNumber(dto.chapterNumber());
        chapter.setTitle(dto.title().trim());
        chapter.setCoverUrl(dto.coverUrl() != null ? dto.coverUrl().trim() : null);
        chapter.setPagesJson(pagesJson);
        chapter.setPublicReleaseAt(dto.publicReleaseAt());

        ChapterEntity saved = chapterRepository.save(chapter);

        // Atualiza contadores na obra
        work.setTotalChapters(work.getTotalChapters() + 1);
        workRepository.save(work);

        return saved;
    }
}
