package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.dto.ChapterReadResponseDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import com.manganetworking.service.work.dto.WorkCommentResponseDto;
import com.manganetworking.service.work.dto.CreateCommentRequestDto;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.service.work.dto.CreateChapterRequestDto;
import com.manganetworking.service.work.dto.CreateWorkRequestDto;
import jakarta.validation.Valid;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/works")
public class WorkController {

    private final WorkApplicationService workService;
    private final com.manganetworking.service.work.WorkCommentService commentService;

    public WorkController(WorkApplicationService workService,
                          com.manganetworking.service.work.WorkCommentService commentService) {
        this.workService = workService;
        this.commentService = commentService;
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

    @GetMapping("/{slug}")
    public ResponseEntity<WorkDetailsResponseDto> getWorkBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(workService.getWorkBySlug(slug));
    }

    /** Comentários da obra: leitura pública, escrita por qualquer conta autenticada. */
    @GetMapping("/{workId}/comments")
    public ResponseEntity<java.util.List<WorkCommentResponseDto>> listComments(
            @PathVariable UUID workId,
            @RequestParam(defaultValue = "50") int limit
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(commentService.listComments(workId, limit));
    }

    @PostMapping("/{workId}/comments")
    public ResponseEntity<WorkCommentResponseDto> createComment(
            @PathVariable UUID workId,
            @Valid @RequestBody CreateCommentRequestDto dto
    ) {
        UUID userId = SecurityContextUtils.requireCurrentUserId();
        return ResponseEntity.ok(commentService.createComment(userId, workId, dto.chapterId(), dto.body()));
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
