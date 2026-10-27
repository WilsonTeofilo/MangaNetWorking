package com.manganetworking.service.catalog;

import com.manganetworking.domain.enums.Genre;
import com.manganetworking.domain.enums.WorkFormat;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.catalog.dto.CatalogPageResponseDto;
import com.manganetworking.service.catalog.dto.CatalogReleaseResponseDto;
import com.manganetworking.service.catalog.dto.CatalogWorkResponseDto;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Catálogo e lançamentos com o formato como primeiro eixo.
 *
 * <p>Toda a filtragem, ordenação e paginação acontece no PostgreSQL — a fonte de verdade das
 * obras. O feed do MongoDB continua sendo o motor de recomendação, mas não é usado aqui: o
 * catálogo não pode depender do último sync para refletir um filtro.</p>
 *
 * <p>Regras de privacidade: obras suspensas ou arquivadas por LGPD nunca entram, em nenhum dos
 * eixos. Lançamentos só incluem capítulo cuja data de publicação já passou (agendado não vaza).</p>
 */
@Service
public class CatalogQueryService {

    private static final List<String> HIDDEN_STATUSES = List.of("suspended", "archived_lgpd", "draft");
    private static final Set<String> VISIBLE_STATUSES = Set.of("ongoing", "completed", "hiatus");
    private static final Set<String> ALLOWED_SORTS = Set.of("relevance", "recent", "updated", "views", "title");
    private static final int MAX_PAGE_SIZE = 48;
    /** Teto de página: evita deep offset acidental (48 × 200 = 9.600 obras por recorte). */
    private static final int MAX_PAGE = 200;
    private static final int MAX_RELEASES = 60;

    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;

    public CatalogQueryService(WorkRepository workRepository, ChapterRepository chapterRepository) {
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
    }

    @Transactional(readOnly = true)
    public CatalogPageResponseDto search(
            String formatRaw,
            List<String> genreRaw,
            String statusRaw,
            String audienceRaw,
            String term,
            String sortRaw,
            boolean withPresentation,
            int page,
            int size
    ) {
        WorkFormat format = parseFormat(formatRaw);
        List<Genre> genres = parseGenres(genreRaw);
        String status = VISIBLE_STATUSES.contains(normalize(statusRaw)) ? normalize(statusRaw) : null;
        Genre audience = parseAudience(audienceRaw);

        Specification<WorkEntity> base = baseSpec(term, genres, status, audience, withPresentation);
        Specification<WorkEntity> filtered = format == null ? base : base.and(hasFormat(format));

        int safePage = Math.min(Math.max(page, 0), MAX_PAGE);
        int safeSize = clampSize(size);
        Pageable pageable = PageRequest.of(safePage, safeSize, sort(sortRaw));

        Page<WorkEntity> result = workRepository.findAll(filtered, pageable);

        long totalAll = workRepository.count(base);
        long totalManga = workRepository.count(base.and(hasFormat(WorkFormat.MANGA)));
        long totalLightNovel = workRepository.count(base.and(hasFormat(WorkFormat.LIGHT_NOVEL)));

        return new CatalogPageResponseDto(
                result.getContent().stream().map(this::toDto).toList(),
                safePage,
                safeSize,
                result.getTotalElements(),
                result.getTotalPages(),
                totalAll,
                totalManga,
                totalLightNovel
        );
    }

    @Transactional(readOnly = true)
    public List<CatalogReleaseResponseDto> releases(String formatRaw, int limit) {
        WorkFormat format = parseFormat(formatRaw);
        int safeLimit = Math.min(Math.max(limit, 1), MAX_RELEASES);
        List<ChapterEntity> chapters = chapterRepository.findRecentReleases(
                LocalDateTime.now(), format, PageRequest.of(0, safeLimit));
        return chapters.stream().map(this::toReleaseDto).toList();
    }

    /* ------------------------------------------------------------------ */

    private Specification<WorkEntity> baseSpec(
            String term,
            List<Genre> genres,
            String status,
            Genre audience,
            boolean withPresentation
    ) {
        String search = term == null ? null : term.trim().toLowerCase(Locale.ROOT);

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.not(root.get("status").in(HIDDEN_STATUSES)));

            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (audience != null) {
                predicates.add(genreExists(query, cb, root, List.of(audience)));
            }
            if (!genres.isEmpty()) {
                // Seleção múltipla de gênero = "qualquer um destes" (OR dentro do mesmo eixo).
                predicates.add(genreExists(query, cb, root, genres));
            }
            if (withPresentation) {
                predicates.add(cb.isNotNull(root.get("presentationJson")));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search + "%";
                Join<WorkEntity, CreatorEntity> author = root.join("author", JoinType.LEFT);
                Join<CreatorEntity, ?> authorUser = author.join("user", JoinType.LEFT);

                List<Predicate> textMatches = new ArrayList<>();
                textMatches.add(cb.like(cb.lower(root.get("title")), like));
                textMatches.add(cb.like(cb.lower(root.get("synopsis")), like));
                textMatches.add(cb.like(cb.lower(author.get("handle").as(String.class)), like));
                textMatches.add(cb.like(cb.lower(authorUser.get("name").as(String.class)), like));

                List<Genre> termGenres = GenreLabels.matching(search);
                if (!termGenres.isEmpty()) {
                    textMatches.add(genreExists(query, cb, root, termGenres));
                }
                predicates.add(cb.or(textMatches.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Specification<WorkEntity> hasFormat(WorkFormat format) {
        return (root, query, cb) -> cb.equal(root.get("format"), format);
    }

    /**
     * Existe gênero da obra dentro da lista informada.
     *
     * <p>Subquery com {@code exists} mantém a paginação correta: um {@code join} direto na
     * coleção multiplicaria a linha por gênero e o {@code count} mentiria.</p>
     */
    private Predicate genreExists(
            jakarta.persistence.criteria.CriteriaQuery<?> query,
            jakarta.persistence.criteria.CriteriaBuilder cb,
            Root<WorkEntity> root,
            List<Genre> genres
    ) {
        Subquery<Integer> subquery = query.subquery(Integer.class);
        Root<WorkEntity> subRoot = subquery.from(WorkEntity.class);
        Join<WorkEntity, Genre> join = subRoot.join("genres");
        subquery.select(cb.literal(1))
                .where(cb.equal(subRoot.get("id"), root.get("id")), join.in(genres));
        return cb.exists(subquery);
    }

    private Sort sort(String sortRaw) {
        String key = normalize(sortRaw);
        if (!ALLOWED_SORTS.contains(key)) {
            key = "relevance";
        }
        return switch (key) {
            case "recent" -> Sort.by(Sort.Order.desc("createdAt"));
            case "updated" -> Sort.by(Sort.Order.desc("updatedAt"));
            case "views" -> Sort.by(Sort.Order.desc("totalViews"));
            case "title" -> Sort.by(Sort.Order.asc("title"));
            default -> Sort.by(Sort.Order.desc("totalViews"), Sort.Order.desc("totalFavorites"),
                    Sort.Order.asc("title"));
        };
    }

    private CatalogWorkResponseDto toDto(WorkEntity work) {
        CreatorEntity author = work.getAuthor();
        String authorName = author == null ? null
                : author.getUser() != null ? author.getUser().getName() : author.getHandle();
        return new CatalogWorkResponseDto(
                work.getId(),
                work.getSlug(),
                work.getTitle(),
                work.getOriginalTitle(),
                work.getSynopsis(),
                work.getCoverUrl(),
                work.getFormat(),
                List.copyOf(work.getGenres()),
                work.getStatus() != null ? work.getStatus().name() : null,
                work.getTotalChapters(),
                work.getTotalViews(),
                work.getTotalFavorites(),
                work.getTotalLikes(),
                work.getTotalComments(),
                authorName,
                author == null ? null : author.getHandle(),
                author == null ? null : author.getAvatarUrl(),
                work.getCreatedAt(),
                work.getUpdatedAt()
        );
    }

    private CatalogReleaseResponseDto toReleaseDto(ChapterEntity chapter) {
        WorkEntity work = chapter.getWork();
        return new CatalogReleaseResponseDto(
                work.getId(),
                work.getSlug(),
                work.getTitle(),
                work.getCoverUrl(),
                work.getFormat(),
                chapter.getId(),
                chapter.getChapterNumber(),
                chapter.getTitle(),
                chapter.getChapterType(),
                chapter.getPublicReleaseAt(),
                work.getTotalChapters() == null ? 0 : work.getTotalChapters(),
                work.getTotalViews(),
                work.getTotalFavorites()
        );
    }

    /** Valor inválido cai em "Tudo" — nunca esconde conteúdo por parâmetro corrompido. */
    private WorkFormat parseFormat(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String key = raw.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        return switch (key) {
            case "MANGA" -> WorkFormat.MANGA;
            case "LIGHT_NOVEL", "LIGHTNOVEL", "NOVEL" -> WorkFormat.LIGHT_NOVEL;
            default -> null;
        };
    }

    private List<Genre> parseGenres(List<String> raw) {
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        return raw.stream()
                .flatMap(value -> java.util.Arrays.stream(value.split(",")))
                .map(GenreLabels::parse)
                .flatMap(java.util.Optional::stream)
                .distinct()
                .toList();
    }

    private Genre parseAudience(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return GenreLabels.parse(raw)
                .filter(genre -> genre == Genre.SHONEN || genre == Genre.SEINEN)
                .orElse(null);
    }

    private int clampSize(int size) {
        if (size < 1) {
            return 24;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
