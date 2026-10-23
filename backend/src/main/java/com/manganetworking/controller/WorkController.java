package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.dto.ChapterReadResponseDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import com.manganetworking.service.work.dto.WorkCommentResponseDto;
import com.manganetworking.service.work.dto.CommentLikeResponseDto;
import com.manganetworking.service.work.dto.CommentPageResponseDto;
import com.manganetworking.service.work.dto.CreateCommentRequestDto;
import com.manganetworking.service.work.dto.ReportCommentRequestDto;
import com.manganetworking.service.work.dto.UpdateCommentRequestDto;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import com.manganetworking.service.work.dto.UpdateWorkRequestDto;
import com.manganetworking.service.work.dto.UpdateChapterRequestDto;
import com.manganetworking.service.work.dto.CreatorWorkSummaryResponseDto;
import com.manganetworking.service.user.dto.ToggleLikeResponseDto;
import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/works")
public class WorkController {

    private final WorkApplicationService workService;
    private final com.manganetworking.service.work.WorkCommentService commentService;
    private final com.manganetworking.service.work.ChapterLikeService chapterLikeService;

    public WorkController(WorkApplicationService workService,
                          com.manganetworking.service.work.WorkCommentService commentService,
                          com.manganetworking.service.work.ChapterLikeService chapterLikeService) {
        this.workService = workService;
        this.commentService = commentService;
        this.chapterLikeService = chapterLikeService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createWork(@Valid @RequestBody CreateWorkRequestDto dto) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        WorkEntity work = workService.createWork(creatorId, dto);
        return ResponseEntity.ok(Map.of(
                "workId", work.getId(),
                "title", work.getTitle(),
                "slug", work.getSlug(),
                "message", "Obra criada com sucesso. Autoria original confirmada."
        ));
    }

    @PostMapping("/{workId}/chapters")
    public ResponseEntity<Map<String, Object>> createChapter(
            @PathVariable UUID workId,
            @Valid @RequestBody CreateChapterRequestDto dto
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        ChapterEntity chapter = workService.createChapter(creatorId, workId, dto);
        return ResponseEntity.ok(Map.of(
                "chapterId", chapter.getId(),
                "chapterNumber", chapter.getChapterNumber(),
                "title", chapter.getTitle(),
                "publicReleaseAt", chapter.getPublicReleaseAt(),
                "isEarlyAccess", chapter.isEarlyAccessForMembers(),
                "message", "Capítulo cadastrado com sucesso."
        ));
    }

    /**
     * Configuracao da obra pelo proprio autor (capa, banner, categorias, titulo,
     * sinopse e estado). Capitulos tem o proprio fluxo de publicacao.
     */
    @PutMapping("/{workId}")
    public ResponseEntity<Map<String, Object>> updateWork(
            @PathVariable UUID workId,
            @Valid @RequestBody UpdateWorkRequestDto dto
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        WorkEntity work = workService.updateWork(creatorId, workId, dto);
        return ResponseEntity.ok(Map.of(
                "workId", work.getId(),
                "title", work.getTitle(),
                "slug", work.getSlug(),
                "status", work.getStatus(),
                "message", "Obra atualizada com sucesso."
        ));
    }

    /**
     * As obras do proprio autor (tela "Minhas obras"): capa, estado e numeros para
     * configurar e acompanhar cada obra.
     */
    /** Remove a obra do proprio autor. */
    @DeleteMapping("/{workId}")
    public ResponseEntity<Map<String, Object>> deleteWork(@PathVariable UUID workId) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        workService.deleteWork(creatorId, workId);
        return ResponseEntity.ok(Map.of("message", "Obra removida do catálogo."));
    }

    /**
     * Exclui um capitulo do proprio autor (com as paginas vinculadas em cascata).
     */
    @DeleteMapping("/{workId}/chapters/{chapterNumber}")
    public ResponseEntity<Map<String, Object>> deleteChapter(
            @PathVariable UUID workId,
            @PathVariable Integer chapterNumber
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        workService.deleteChapter(creatorId, workId, chapterNumber);
        return ResponseEntity.ok(Map.of("message", "Capítulo excluído."));
    }

    /**
     * Edicao de um capitulo pelo autor: paginas (nova ordem), capa, titulo, texto e data.
     */
    @PutMapping("/{workId}/chapters/{chapterNumber}")
    public ResponseEntity<Map<String, Object>> updateChapter(
            @PathVariable UUID workId,
            @PathVariable Integer chapterNumber,
            @Valid @RequestBody UpdateChapterRequestDto dto
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        ChapterEntity chapter = workService.updateChapter(creatorId, workId, chapterNumber, dto);
        return ResponseEntity.ok(Map.of(
                "chapterId", chapter.getId(),
                "chapterNumber", chapter.getChapterNumber(),
                "message", "Capítulo atualizado com sucesso."
        ));
    }

    @GetMapping("/mine")
    public ResponseEntity<List<CreatorWorkSummaryResponseDto>> listMyWorks() {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(workService.listCreatorWorks(creatorId));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<WorkDetailsResponseDto> getWorkBySlug(@PathVariable String slug) {
        // O autor (e a moderacao) ve os capitulos ainda nao liberados; o leitor, so os publicados.
        UUID currentUserId = SecurityContextUtils.resolveCurrentUserId(null);
        return ResponseEntity.ok(workService.getWorkBySlug(slug, currentUserId));
    }

    /** Comentários da obra/capítulo: leitura pública, escrita por conta autenticada. */
    @GetMapping("/{workId}/comments")
    public ResponseEntity<CommentPageResponseDto> listComments(
            @PathVariable UUID workId,
            @RequestParam(required = false) UUID chapterId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "top") String sort
    ) {
        UUID currentUserId = SecurityContextUtils.resolveCurrentUserId(null);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(commentService.listComments(workId, chapterId, page, size, sort, currentUserId));
    }

    @PostMapping("/{workId}/comments")
    public ResponseEntity<WorkCommentResponseDto> createComment(
            @PathVariable UUID workId,
            @Valid @RequestBody CreateCommentRequestDto dto
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(commentService.createComment(
                userId, workId, dto.chapterId(), dto.parentId(), dto.body()));
    }

    @PutMapping("/{workId}/comments/{commentId}")
    public ResponseEntity<WorkCommentResponseDto> editComment(
            @PathVariable UUID workId,
            @PathVariable UUID commentId,
            @Valid @RequestBody UpdateCommentRequestDto dto
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(commentService.editComment(userId, workId, commentId, dto.body()));
    }

    @DeleteMapping("/{workId}/comments/{commentId}")
    public ResponseEntity<Map<String, String>> deleteComment(
            @PathVariable UUID workId,
            @PathVariable UUID commentId
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        commentService.deleteComment(userId, workId, commentId);
        return ResponseEntity.ok(Map.of("message", "Comentário excluído."));
    }

    @PostMapping("/{workId}/comments/{commentId}/like")
    public ResponseEntity<CommentLikeResponseDto> toggleCommentLike(
            @PathVariable UUID workId,
            @PathVariable UUID commentId
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(commentService.toggleLike(userId, workId, commentId));
    }

    @PostMapping("/{workId}/comments/{commentId}/report")
    public ResponseEntity<Map<String, String>> reportComment(
            @PathVariable UUID workId,
            @PathVariable UUID commentId,
            @Valid @RequestBody ReportCommentRequestDto dto
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        commentService.reportComment(userId, workId, commentId, dto);
        return ResponseEntity.ok(Map.of("message", "Denúncia recebida. A moderação vai analisar."));
    }

    /** Curtida do capítulo (coração). A obra exibe a soma das curtidas dos capítulos. */
    @PostMapping("/{workId}/chapters/{chapterNumber}/like")
    public ResponseEntity<ToggleLikeResponseDto> toggleChapterLike(
            @PathVariable UUID workId,
            @PathVariable Integer chapterNumber
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(chapterLikeService.toggle(userId, workId, chapterNumber));
    }

    @GetMapping("/{slug}/chapters/{chapterNumber}")
    public ResponseEntity<ChapterReadResponseDto> readChapter(
            @PathVariable String slug,
            @PathVariable Integer chapterNumber
    ) {
        // Identidade apenas pela sessão: nunca por header controlado pelo cliente (evita burlar o Early Access).
        UUID currentUserId = SecurityContextUtils.resolveCurrentUserId(null);
        return ResponseEntity.ok(workService.readChapter(slug, chapterNumber, currentUserId));
    }
}
