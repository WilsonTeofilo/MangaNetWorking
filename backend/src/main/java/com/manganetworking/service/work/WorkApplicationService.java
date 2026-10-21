package com.manganetworking.service.work;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.enums.ChapterFormat;
import com.manganetworking.domain.relational.ChapterFileEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterFileRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.feed.event.WorkFeedSyncEvent;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.work.dto.*;
import com.manganetworking.util.StorageFileNames;
import org.springframework.context.ApplicationEventPublisher;
import com.manganetworking.service.feed.event.WorkFeedRemovalEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class WorkApplicationService {

    private static final int MAX_CHAPTER_PAGES = 300;

    /** Status de obra suspensa cautelarmente pela moderação. */
    private static final String STATUS_SUSPENDED = "suspended";
    private static final String STATUS_ARCHIVED_LGPD = "archived_lgpd";

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final ChapterFileRepository chapterFileRepository;
    private final MembershipSubscriptionRepository membershipRepository;
    private final CreatorRepository creatorRepository;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher eventPublisher;

    public WorkApplicationService(
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            ChapterFileRepository chapterFileRepository,
            MembershipSubscriptionRepository membershipRepository,
            CreatorRepository creatorRepository,
            ObjectMapper objectMapper,
            ApplicationEventPublisher eventPublisher
    ) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.chapterFileRepository = chapterFileRepository;
        this.membershipRepository = membershipRepository;
        this.creatorRepository = creatorRepository;
        this.objectMapper = objectMapper;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(readOnly = true)
    public WorkDetailsResponseDto getWorkBySlug(String slug) {
        WorkEntity work = workRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada: " + slug));

        assertWorkVisible(work);

        List<ChapterEntity> chapters = chapterRepository.findAllByWorkIdOrderByChapterNumberDesc(work.getId());
        CreatorEntity author = work.getAuthor();

        LocalDateTime now = LocalDateTime.now();
        List<ChapterSummaryDto> chaptersDto = chapters.stream()
                .filter(chapter -> chapter.getPublicReleaseAt() != null
                        && !chapter.getPublicReleaseAt().isAfter(now))
                .map(cap -> new ChapterSummaryDto(
                        cap.getId(),
                        cap.getChapterNumber(),
                        cap.getTitle(),
                        cap.getCoverUrl(),
                        cap.getPublicReleaseAt(),
                        cap.isEarlyAccessForMembers(),
                        cap.getViews(),
                        cap.getLikes(),
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
                work.getStatus(),
                work.getFormat(),
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

        assertWorkVisible(work);

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
                author != null ? author.getId() : null,
                chapter.getFormat(),
                chapter.getContentText()
        );
    }

    /**
     * Cadastro de nova obra pelo autor com declaração obrigatória de autoria original
     */
    /**
     * Lista as obras do proprio autor (tela "Minhas obras").
     *
     * @param creatorId autor da sessao
     * @return as obras dele, da mais atual para a mais antiga
     */
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
                        work.getStatus(),
                        work.getTotalChapters(),
                        work.getTotalViews(),
                        work.getTotalLikes()))
                .sorted(Comparator.comparing(CreatorWorkSummaryResponseDto::title, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    /**
     * Atualiza a configuracao da obra pelo proprio autor (capa, banner, categorias,
     * titulo, sinopse e estado). Capitulos NAO sao tocados aqui: cada capitulo tem
     * o proprio fluxo de publicacao.
     *
     * @param creatorId autor da sessao
     * @param workId    obra a atualizar
     * @param dto       novos dados
     * @return a obra atualizada
     */
    /**
     * Remove a obra do proprio autor (com os capitulos vinculados em cascata).
     *
     * @param creatorId autor da sessao
     * @param workId    obra a remover
     */
    @Transactional
    public void deleteWork(UUID creatorId, UUID workId) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra nao encontrada"));
        if (work.getAuthor() == null || !creatorId.equals(work.getAuthor().getId())) {
            throw new AccessDeniedException("Apenas o autor da obra pode remove-la.");
        }
        workRepository.delete(work);
        // A obra removida nao pode continuar aparecendo no feed/cache do Mongo.
        eventPublisher.publishEvent(new WorkFeedRemovalEvent(workId));
    }

    public WorkEntity updateWork(UUID creatorId, UUID workId, UpdateWorkRequestDto dto) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra nÃ£o encontrada"));
        if (work.getAuthor() == null || !creatorId.equals(work.getAuthor().getId())) {
            throw new AccessDeniedException("Apenas o autor da obra pode alterÃ¡-la.");
        }

        work.setTitle(com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.title().trim()));
        work.setSynopsis(com.manganetworking.util.SanitizationUtils.sanitizeText(dto.synopsis().trim()));
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
        return saved;
    }

    /** Estados aceitos na configuracao da obra (rascunho, em lancamento, concluida). */
    private String normalizeWorkStatus(String status) {
        String value = status.trim().toLowerCase(Locale.ROOT);
        return switch (value) {
            case "draft" -> "draft";
            case "completed" -> "completed";
            default -> "ongoing";
        };
    }

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

        String safeTitle = com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.title().trim());
        String safeSynopsis = com.manganetworking.util.SanitizationUtils.sanitizeText(dto.synopsis().trim());
        String safeOriginalTitle = dto.originalTitle() != null ? com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.originalTitle().trim()) : null;

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
        work.setStatus("ongoing");

        WorkEntity saved = workRepository.save(work);
        publishFeedSync(saved.getId(), "cadastro");
        return saved;
    }

    /**
     * Publicação de novo capítulo com agendamento de liberação pública
     */
    @Transactional
    public ChapterEntity createChapter(UUID creatorId, UUID workId, CreateChapterRequestDto dto) {
        ChapterFormat format = dto.format();
        List<String> pages = dto.pages() == null ? List.of() : dto.pages();
        String content = dto.content() == null ? null : com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.content()).trim();
        if (format == ChapterFormat.IMAGE_PAGES && (pages.isEmpty() || content != null && !content.isBlank())) {
            throw new IllegalArgumentException("Capítulos de mangá precisam conter páginas e não aceitam texto de prosa.");
        }
        if (format == ChapterFormat.PROSE && (content == null || content.isBlank() || !pages.isEmpty())) {
            throw new IllegalArgumentException("Capítulos em prosa precisam de texto e não aceitam páginas de imagem.");
        }
        if (format == ChapterFormat.PROSE && content.length() > 2_000_000) {
            throw new IllegalArgumentException("O texto do capítulo excede o limite de 2 MB.");
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
            try {
                pagesJson = objectMapper.writeValueAsString(pages);
            } catch (JsonProcessingException e) {
                throw new IllegalArgumentException("Erro ao serializar páginas do capítulo: " + e.getMessage());
            }
        }

        String safeTitle = com.manganetworking.util.SanitizationUtils.stripAllHtml(dto.title().trim());

        ChapterEntity chapter = new ChapterEntity();
        chapter.setWork(work);
        chapter.setChapterNumber(dto.chapterNumber());
        chapter.setTitle(safeTitle);
        chapter.setCoverUrl(dto.coverUrl() != null ? dto.coverUrl().trim() : null);
        chapter.setPagesJson(pagesJson);
        chapter.setFormat(format);
        chapter.setContentText(format == ChapterFormat.PROSE ? content : null);
        chapter.setPublicReleaseAt(dto.publicReleaseAt());

        ChapterEntity saved = chapterRepository.save(chapter);
        if (format == ChapterFormat.IMAGE_PAGES) registerChapterFiles(saved.getId(), pages);

        // Atualiza contadores na obra
        work.setTotalChapters(work.getTotalChapters() + 1);
        WorkEntity updatedWork = workRepository.save(work);

        publishFeedSync(updatedWork.getId(), "publicação de capítulo");

        return saved;
    }

    /**
     * Registra a relação arquivo -> capítulo consultada pelo {@code ChapterFileAccessGuard}.
     *
     * <p>O contrato do leitor guarda a URL da página ({@code /api/storage/<arquivo>}) em
     * {@code pages_json}; o guard recebe apenas o nome do arquivo. Normalizar aqui (e não no guard)
     * mantém uma única representação indexada e permite que a checagem seja por igualdade.</p>
     *
     * <p>Nomes repetidos na mesma lista são registrados uma única vez: o índice de
     * {@code chapter_files.filename} é único em toda a tabela (é o que garante a busca sem
     * ambiguidade do guard), então uma página duplicada violaria a restrição. O leitor continua
     * recebendo a lista original em {@code pages_json}; só a relação de acesso é deduplicada.</p>
     */
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

    /**
     * Obra suspensa cautelarmente só é visível ao próprio autor e à moderação.
     * Sem esta checagem, a página de detalhe e o leitor continuavam servindo a obra (e a lista de
     * páginas) mesmo depois da suspensão, embora o feed e as imagens já estivessem bloqueados.
     */
    private void assertWorkVisible(WorkEntity work) {
        if (work != null && STATUS_ARCHIVED_LGPD.equalsIgnoreCase(work.getStatus())) {
            throw new ResourceNotFoundException("Obra não encontrada.");
        }
        if (work == null || work.getStatus() == null || !STATUS_SUSPENDED.equalsIgnoreCase(work.getStatus())) {
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

    /**
     * Publica o pedido de sincronização do feed. O MongoDB não participa da transação JPA: se a escrita
     * fosse feita dentro dela e o Mongo falhasse, o transceptor JPA marcaria a transação relacional como
     * rollback-only e o commit resultaria em {@code UnexpectedRollbackException}, derrubando o cadastro.
     * O tratamento é feito por {@code FeedSynchronizationListener} em {@code AFTER_COMMIT}.
     */
    private void publishFeedSync(UUID workId, String context) {
        eventPublisher.publishEvent(new WorkFeedSyncEvent(workId, context));
    }
}
