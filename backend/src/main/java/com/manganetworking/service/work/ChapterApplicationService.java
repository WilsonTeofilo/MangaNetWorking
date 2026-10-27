package com.manganetworking.service.work;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.enums.ChapterType;
import com.manganetworking.domain.enums.MembershipStatus;
import com.manganetworking.domain.enums.WorkStatus;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.ChapterFileEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterFileRepository;
import com.manganetworking.repository.jpa.ChapterLikeRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.notification.NotificationService;
import com.manganetworking.service.work.dto.*;
import com.manganetworking.util.SanitizationUtils;
import com.manganetworking.util.StorageFileNames;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class ChapterApplicationService {

    private static final Logger log = LoggerFactory.getLogger(ChapterApplicationService.class);

    private static final int MAX_CHAPTER_PAGES = 300;

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final ChapterFileRepository chapterFileRepository;
    private final MembershipSubscriptionRepository membershipRepository;
    private final ChapterLikeRepository chapterLikeRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;
    private final PlatformProperties properties;
    private final NotificationService notificationService;

    public ChapterApplicationService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            ChapterFileRepository chapterFileRepository,
            MembershipSubscriptionRepository membershipRepository,
            ChapterLikeRepository chapterLikeRepository,
            ObjectMapper objectMapper,
            ApplicationEventPublisher eventPublisher,
            PlatformProperties properties,
            NotificationService notificationService
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.chapterFileRepository = chapterFileRepository;
        this.membershipRepository = membershipRepository;
        this.chapterLikeRepository = chapterLikeRepository;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
        this.properties = properties;
        this.notificationService = notificationService;
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

    @Transactional
    public ChapterSummaryDto createChapter(UUID creatorId, UUID workId, CreateChapterRequestDto dto) {
        ChapterFormat format = dto.format();
        ChapterType chapterType = dto.chapterType();
        List<String> pages = dto.pages() == null ? List.of() : dto.pages();

        boolean hasBlocks = dto.blocksJson() != null && !dto.blocksJson().isBlank();
        boolean hasLegacyProse = dto.content() != null && !dto.content().isBlank();

        if (hasBlocks && (hasLegacyProse || !pages.isEmpty())) {
            throw new IllegalArgumentException("Blocos (blocksJson) são exclusivos com content/pages.");
        }

        String content = null;
        String blocksJson = null;

        if (format == ChapterFormat.PROSE) {
            if (chapterType == ChapterType.PROLOGUE) {
                if (dto.chapterNumber() != 0) {
                    throw new IllegalArgumentException("Prólogo deve ser o capítulo 0.");
                }
                if (chapterRepository.findByWorkIdAndChapterNumber(workId, 0).isPresent()) {
                    throw new IllegalArgumentException("Esta obra já possui um prólogo (capítulo 0).");
                }
            }

            if (hasBlocks) {
                if (dto.blocksJson().length() > ChapterBlocksPolicy.MAX_RAW_JSON_CHARS) {
                    throw new IllegalArgumentException("O JSON de blocos excede o limite técnico de processamento.");
                }
                if (chapterType == ChapterType.PROLOGUE || chapterType == ChapterType.SPECIAL) {
                    ChapterBlocksPolicy.validateSpecialOrPrologueChapter(dto.blocksJson(), chapterType);
                } else {
                    ChapterBlocksPolicy.validateRegularChapter(dto.blocksJson());
                }
                blocksJson = dto.blocksJson();
                content = ChapterBlocksPolicy.blocksToPlainText(blocksJson);
            } else {
                if (dto.content() != null && dto.content().length() > ProseEditorialPolicy.MAX_RAW_CHARACTERS) {
                    throw new IllegalArgumentException("O texto enviado excede o limite técnico de processamento.");
                }
                content = dto.content() == null ? null : ProseEditorialPolicy.normalizePlainText(dto.content());
                if (content == null || content.isBlank() || !pages.isEmpty()) {
                    throw new IllegalArgumentException("Capítulos em prosa precisam de texto e não aceitam páginas de imagem.");
                }
                if (chapterType == ChapterType.PROLOGUE || chapterType == ChapterType.SPECIAL) {
                    ProseEditorialPolicy.validateSpecialOrPrologueChapter(content, chapterType);
                } else {
                    ProseEditorialPolicy.validateRegularChapter(content);
                }
            }
        }

        if (format == ChapterFormat.IMAGE_PAGES && (pages.isEmpty() || content != null && !content.isBlank())) {
            throw new IllegalArgumentException("Capítulos de mangá precisam conter páginas e não aceitam texto de prosa.");
        }
        if (format == ChapterFormat.IMAGE_PAGES && pages.size() > MAX_CHAPTER_PAGES) {
            throw new IllegalArgumentException("O capítulo excede o limite de " + MAX_CHAPTER_PAGES + " páginas.");
        }

        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + workId));

        if (!work.getAuthor().getId().equals(creatorId)) {
            throw new AccessDeniedException("Apenas o autor proprietário pode publicar capítulos nesta obra.");
        }

        boolean formatMatchesWork = work.getFormat() == com.manganetworking.domain.enums.WorkFormat.MANGA
                ? format == ChapterFormat.IMAGE_PAGES
                : format == ChapterFormat.PROSE;
        if (!formatMatchesWork) {
            throw new IllegalArgumentException("O formato do capítulo deve corresponder ao formato da obra.");
        }

        if (chapterRepository.findByWorkIdAndChapterNumber(workId, dto.chapterNumber()).isPresent()) {
            throw new IllegalArgumentException("Capítulo #" + dto.chapterNumber() + " já está cadastrado nesta obra.");
        }

        String pagesJson = null;
        if (format == ChapterFormat.IMAGE_PAGES) {
            pagesJson = writePagesJson(pages);
        }

        String safeTitle = SanitizationUtils.stripAllHtml(dto.title().trim());

        ChapterEntity chapter = new ChapterEntity();
        chapter.setWork(work);
        chapter.setChapterNumber(dto.chapterNumber());
        chapter.setTitle(safeTitle);
        chapter.setCoverUrl(dto.coverUrl() != null ? WorkImageUrlPolicy.cover(dto.coverUrl()) : null);
        chapter.setPagesJson(pagesJson);
        chapter.setFormat(format);
        chapter.setChapterType(chapterType);
        chapter.setContentText(content);
        chapter.setBlocksJson(blocksJson);
        chapter.setBlocksVersion(hasBlocks ? ChapterBlockDto.CURRENT_VERSION : null);
        chapter.setPublicReleaseAt(dto.publicReleaseAt() != null ? dto.publicReleaseAt() : LocalDateTime.now());

        ChapterEntity saved = chapterRepository.save(chapter);
        replaceChapterFiles(saved.getId(), accessFiles(pages, blocksJson));

        work.setTotalChapters(work.getTotalChapters() + 1);
        WorkEntity updatedWork = workRepository.save(work);

        publishFeedSync(updatedWork.getId(), "publicação de capítulo");
        notificationService.notifyNewChapter(saved);

        return toSummaryDto(saved);
    }

    @Transactional
    public ChapterSummaryDto updateChapter(UUID creatorId, UUID workId, Integer number, UpdateChapterRequestDto dto) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + workId));
        if (work.getAuthor() == null || !creatorId.equals(work.getAuthor().getId())) {
            throw new AccessDeniedException("Apenas o autor pode editar capítulos desta obra.");
        }

        ChapterEntity chapter = chapterRepository.findByWorkIdAndChapterNumber(workId, number)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo #" + number + " não encontrado"));

        ChapterType chapterType = chapter.getChapterType();
        ChapterFormat format = dto.format() != null ? dto.format() : chapter.getFormat();
        List<String> pages = dto.pages() != null ? dto.pages() : readPages(chapter);

        boolean hasBlocks = dto.blocksJson() != null && !dto.blocksJson().isBlank();
        boolean hasLegacyProse = dto.content() != null && !dto.content().isBlank();

        if (hasBlocks && (hasLegacyProse || (dto.pages() != null && !dto.pages().isEmpty()))) {
            throw new IllegalArgumentException("Blocos (blocksJson) são exclusivos com content/pages.");
        }

        String content = null;
        String blocksJson = null;
        Integer blocksVersion = null;

        if (format == ChapterFormat.PROSE) {
            if (hasBlocks) {
                if (dto.blocksJson().length() > ChapterBlocksPolicy.MAX_RAW_JSON_CHARS) {
                    throw new IllegalArgumentException("O JSON de blocos excede o limite técnico de processamento.");
                }
                if (chapterType == ChapterType.PROLOGUE || chapterType == ChapterType.SPECIAL) {
                    ChapterBlocksPolicy.validateSpecialOrPrologueChapter(dto.blocksJson(), chapterType);
                } else {
                    ChapterBlocksPolicy.validateRegularChapter(dto.blocksJson());
                }
                blocksJson = dto.blocksJson();
                blocksVersion = ChapterBlockDto.CURRENT_VERSION;
                content = ChapterBlocksPolicy.blocksToPlainText(blocksJson);
            } else {
                if (dto.content() != null && dto.content().length() > ProseEditorialPolicy.MAX_RAW_CHARACTERS) {
                    throw new IllegalArgumentException("O texto enviado excede o limite técnico de processamento.");
                }
                content = dto.content() != null
                        ? ProseEditorialPolicy.normalizePlainText(dto.content())
                        : chapter.getContentText();
                if (content == null || content.isBlank()) {
                    throw new IllegalArgumentException("Capítulos em prosa precisam de texto.");
                }
                if (dto.content() != null) {
                    if (chapterType == ChapterType.PROLOGUE || chapterType == ChapterType.SPECIAL) {
                        ProseEditorialPolicy.validateSpecialOrPrologueChapter(content, chapterType);
                    } else {
                        ProseEditorialPolicy.validateRegularChapter(content);
                    }
                }
                if (chapter.getBlocksJson() != null && dto.blocksJson() == null) {
                    blocksJson = chapter.getBlocksJson();
                    blocksVersion = chapter.getBlocksVersion();
                }
            }
        }

        if (format == ChapterFormat.IMAGE_PAGES && pages.isEmpty()) {
            throw new IllegalArgumentException("Capítulos de mangá precisam de pelo menos uma página.");
        }
        if (format == ChapterFormat.IMAGE_PAGES && pages.size() > MAX_CHAPTER_PAGES) {
            throw new IllegalArgumentException("O capítulo excede o limite de " + MAX_CHAPTER_PAGES + " páginas.");
        }

        chapter.setTitle(SanitizationUtils.stripAllHtml(dto.title().trim()));
        if (dto.coverUrl() != null) {
            chapter.setCoverUrl(WorkImageUrlPolicy.cover(dto.coverUrl()));
        }
        chapter.setFormat(format);
        chapter.setContentText(format == ChapterFormat.PROSE ? content : null);
        if (format == ChapterFormat.IMAGE_PAGES) {
            chapter.setPagesJson(writePagesJson(pages));
        } else if (format == ChapterFormat.PROSE) {
            chapter.setBlocksJson(blocksJson);
            chapter.setBlocksVersion(blocksVersion);
        }
        chapter.setPublicReleaseAt(dto.publicReleaseAt() != null ? dto.publicReleaseAt() : LocalDateTime.now());

        ChapterEntity saved = chapterRepository.save(chapter);
        replaceChapterFiles(saved.getId(), accessFiles(pages, blocksJson));
        publishFeedSync(work.getId(), "edição de capítulo");
        return toSummaryDto(saved);
    }

    @Transactional
    public void deleteChapter(UUID creatorId, UUID workId, Integer number) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + workId));
        if (work.getAuthor() == null || !creatorId.equals(work.getAuthor().getId())) {
            throw new AccessDeniedException("Apenas o autor pode excluir capítulos desta obra.");
        }

        ChapterEntity chapter = chapterRepository.findByWorkIdAndChapterNumber(workId, number)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo #" + number + " não encontrado"));

        long removedLikes = chapter.getLikes() == null ? 0L : chapter.getLikes();
        long removedViews = chapter.getViews() == null ? 0L : chapter.getViews();

        chapterRepository.delete(chapter);
        chapterRepository.flush();

        work.setTotalChapters(Math.max(0, work.getTotalChapters() - 1));
        workRepository.saveAndFlush(work);

        if (removedLikes > 0) {
            workRepository.decrementTotalLikesBy(work.getId(), removedLikes);
        }
        if (removedViews > 0) {
            workRepository.decrementTotalViewsBy(work.getId(), removedViews);
        }

        publishFeedSync(work.getId(), "exclusão de capítulo");
    }


    /** Status de assinatura ativa de membro. Deve coincidir com MembershipSubscriptionEntity.status. */
    // MembershipStatus enum utilizado

    @Transactional
    public ChapterReadResponseDto readChapter(String slug, Integer chapterNumber, UUID currentUserId) {
        WorkEntity work = workRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + slug));

        assertWorkAccessible(work, currentUserId);

        ChapterEntity chapter = chapterRepository.findByWorkIdAndChapterNumber(work.getId(), chapterNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo #" + chapterNumber + " não encontrado na obra " + slug));

        CreatorEntity author = work.getAuthor();
        boolean isEarlyAccess = chapter.isEarlyAccessForMembers();

        boolean privilegedViewer = isAuthorOrModerator(work, currentUserId);

        if (isEarlyAccess && !privilegedViewer) {
            boolean isMember = false;
            if (currentUserId != null && author != null) {
                isMember = membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                        currentUserId, author.getId(), MembershipStatus.ACTIVE, LocalDateTime.now()
                );
            }

            if (!isMember) {
                throw new AccessDeniedException(
                        "Capítulo em Acesso Antecipado exclusivo para membros oficiais do autor @" +
                                (author != null ? author.getHandle() : "")
                );
            }
        }

        if (!privilegedViewer && chapter.getPublicReleaseAt() != null
                && chapter.getPublicReleaseAt().isAfter(LocalDateTime.now())) {
            throw new ResourceNotFoundException("Capítulo #" + chapterNumber + " ainda não foi liberado.");
        }

        boolean likedByMe = currentUserId != null
                && chapterLikeRepository.existsByUser_IdAndChapter_Id(currentUserId, chapter.getId());

        String accessToken = properties != null && properties.getMercadopago() != null
                ? properties.getMercadopago().getAccessToken()
                : null;
        boolean paymentsConfigured = accessToken != null && !accessToken.isBlank();
        boolean supportEnabled = author != null && author.isMonetizationUnlocked() && paymentsConfigured;

        return new ChapterReadResponseDto(
                false,
                chapter.getId(),
                work.getTitle(),
                chapter.getChapterNumber(),
                chapter.getTitle(),
                chapter.getPagesJson(),
                chapter.getLikes(),
                likedByMe,
                author != null ? "@" + author.getHandle() : "",
                author != null ? author.getId() : null,
                supportEnabled,
                author != null ? author.getMembershipPriceBrl() : null,
                chapter.getFormat(),
                chapter.getContentText(),
                chapter.getBlocksJson(),
                chapter.getChapterType()
        );
    }

    private ChapterSummaryDto toSummaryDto(ChapterEntity cap) {
        return new ChapterSummaryDto(
                cap.getId(),
                cap.getChapterNumber(),
                cap.getTitle(),
                cap.getCoverUrl(),
                cap.getPublicReleaseAt(),
                cap.isEarlyAccessForMembers(),
                cap.getViews() != null ? cap.getViews() : 0L,
                cap.getLikes() != null ? cap.getLikes() : 0L,
                cap.getFormat()
        );
    }

    private String writePagesJson(List<String> pages) {
        try {
            return objectMapper.writeValueAsString(pages);
        } catch (JsonProcessingException e) {
            log.error("[CHAPTER] Falha ao serializar paginas: {}", e.getMessage());
            throw new IllegalArgumentException("Não foi possível processar as páginas do capítulo.");
        }
    }

    private List<String> readPages(ChapterEntity chapter) {
        if (chapter.getPagesJson() == null || chapter.getPagesJson().isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(chapter.getPagesJson(), new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private List<String> accessFiles(List<String> pages, String blocksJson) {
        if (blocksJson == null || blocksJson.isBlank()) {
            return pages;
        }

        List<String> files = new ArrayList<>(pages);
        try {
            JsonNode root = objectMapper.readTree(blocksJson);
            for (JsonNode block : root.path("blocks")) {
                if (!"illustration".equals(block.path("type").asText())) {
                    continue;
                }
                String fileId = block.path("content").path("fileId").asText(null);
                if (fileId != null && !fileId.isBlank()) {
                    files.add(fileId);
                }
            }
        } catch (JsonProcessingException ignored) {
        }
        return files;
    }

    private void registerChapterFiles(UUID chapterId, List<String> pages) {
        if (chapterId == null || pages == null || pages.isEmpty()) {
            return;
        }

        List<ChapterFileEntity> files = new ArrayList<>(pages.size());
        Set<String> registered = new HashSet<>(pages.size());
        for (int i = 0; i < pages.size(); i++) {
            String filename = StorageFileNames.fromPageToken(pages.get(i));
            if (filename != null && registered.add(filename)) {
                files.add(new ChapterFileEntity(chapterId, filename, i));
            }
        }

        if (!files.isEmpty()) {
            chapterFileRepository.saveAll(files);
        }
    }

    private void replaceChapterFiles(UUID chapterId, List<String> pages) {
        if (chapterId == null) {
            return;
        }
        chapterFileRepository.deleteByChapterId(chapterId);
        chapterFileRepository.flush();
        registerChapterFiles(chapterId, pages);
    }

    private void publishFeedSync(UUID workId, String context) {
        eventPublisher.publishEvent(new WorkFeedSyncEvent(workId, context));
    }

    /**
     * Garante que a obra esteja acessível ao público antes de expor qualquer
     * capítulo via GET. Obras suspensas por moderação só são visíveis para o
     * próprio autor ou para moderadores; obras arquivadas por LGPD são
     * invisíveis para todos.
     */
    private void assertWorkAccessible(WorkEntity work, UUID currentUserId) {
        if (work == null || work.getStatus() == null) {
            return;
        }
        if (work.getStatus() == WorkStatus.ARCHIVED_LGPD) {
            throw new ResourceNotFoundException("Obra não encontrada.");
        }
        if (work.getStatus() == WorkStatus.SUSPENDED) {
            if (!isAuthorOrModerator(work, currentUserId)) {
                throw new AccessDeniedException("Esta obra está suspensa cautelarmente e indisponível.");
            }
        }
    }
}
