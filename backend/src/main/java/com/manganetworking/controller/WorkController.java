package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.dto.ChapterReadResponseDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
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

    public WorkController(WorkApplicationService workService) {
        this.workService = workService;
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
