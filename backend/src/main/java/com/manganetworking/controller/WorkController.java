package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.user.dto.ToggleLikeResponseDto;
import com.manganetworking.service.work.ChapterApplicationService;
import com.manganetworking.service.work.ChapterLikeService;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.WorkCommentService;
import com.manganetworking.service.work.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/works")
public class WorkController {

    private final WorkApplicationService workService;
    private final ChapterApplicationService chapterService;
    private final WorkCommentService commentService;
    private final ChapterLikeService chapterLikeService;

    public WorkController(
            WorkApplicationService workService,
            ChapterApplicationService chapterService,
            WorkCommentService commentService,
            ChapterLikeService chapterLikeService
    ) {
        this.workService = workService;
        this.chapterService = chapterService;
        this.commentService = commentService;
        this.chapterLikeService = chapterLikeService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createWork(@Valid @RequestBody CreateWorkRequestDto dto) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        WorkDetailsResponseDto work = workService.createWork(creatorId, dto);
        return ResponseEntity.ok(Map.of(
                "workId", work.id(),
                "title", work.title(),
                "slug", work.slug(),
                "message", "Obra criada com sucesso. Autoria original confirmada."
        ));
    }

    @PostMapping("/{workId}/chapters")
    public ResponseEntity<Map<String, Object>> createChapter(
            @PathVariable UUID workId,
            @Valid @RequestBody CreateChapterRequestDto dto
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        ChapterSummaryDto chapter = chapterService.createChapter(creatorId, workId, dto);
        return ResponseEntity.ok(Map.of(
                "chapterId", chapter.id(),
                "chapterNumber", chapter.chapterNumber(),
                "title", chapter.title(),
                "publicReleaseAt", chapter.publicReleaseAt(),
                "isEarlyAccess", chapter.isEarlyAccess(),
                "message", "Capítulo cadastrado com sucesso."
        ));
    }

    @PutMapping("/{workId}")
    public ResponseEntity<Map<String, Object>> updateWork(
            @PathVariable UUID workId,
            @Valid @RequestBody UpdateWorkRequestDto dto
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        WorkDetailsResponseDto work = workService.updateWork(creatorId, workId, dto);
        return ResponseEntity.ok(Map.of(
                "workId", work.id(),
                "title", work.title(),
                "slug", work.slug(),
                "status", work.status(),
                "message", "Obra atualizada com sucesso."
        ));
    }

    @DeleteMapping("/{workId}")
    public ResponseEntity<Map<String, Object>> deleteWork(@PathVariable UUID workId) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        workService.deleteWork(creatorId, workId);
        return ResponseEntity.ok(Map.of("message", "Obra removida do catálogo."));
    }

    @DeleteMapping("/{workId}/chapters/{chapterNumber}")
    public ResponseEntity<Map<String, Object>> deleteChapter(
            @PathVariable UUID workId,
            @PathVariable Integer chapterNumber
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        chapterService.deleteChapter(creatorId, workId, chapterNumber);
        return ResponseEntity.ok(Map.of("message", "Capítulo excluído."));
    }

    @PutMapping("/{workId}/chapters/{chapterNumber}")
    public ResponseEntity<Map<String, Object>> updateChapter(
            @PathVariable UUID workId,
            @PathVariable Integer chapterNumber,
            @Valid @RequestBody UpdateChapterRequestDto dto
    ) {
        UUID creatorId = SecurityContextUtils.requireCurrentCreatorId();
        ChapterSummaryDto chapter = chapterService.updateChapter(creatorId, workId, chapterNumber, dto);
        return ResponseEntity.ok(Map.of(
                "chapterId", chapter.id(),
                "chapterNumber", chapter.chapterNumber(),
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
        UUID currentUserId = SecurityContextUtils.resolveCurrentUserId(null);
        return ResponseEntity.ok(workService.getWorkBySlug(slug, currentUserId));
    }

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
        UUID currentUserId = SecurityContextUtils.resolveCurrentUserId(null);
        return ResponseEntity.ok(chapterService.readChapter(slug, chapterNumber, currentUserId));
    }
}
