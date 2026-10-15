package com.manganetworking.controller;

import com.manganetworking.service.work.WorkApplicationService;
import com.manganetworking.service.work.dto.ChapterReadResponseDto;
import com.manganetworking.service.work.dto.WorkDetailsResponseDto;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/works")
public class WorkController {

    private final WorkApplicationService workService;

    public WorkController(WorkApplicationService workService) {
        this.workService = workService;
    }

    @GetMapping("/{slug}")
    public ResponseEntity<WorkDetailsResponseDto> getWorkBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(workService.getWorkBySlug(slug));
    }

    @GetMapping("/{slug}/chapters/{chapterNumber}")
    public ResponseEntity<ChapterReadResponseDto> readChapter(
            @PathVariable String slug,
            @PathVariable Integer chapterNumber,
            @RequestHeader(value = "X-Current-User-Id", required = false) UUID currentUserId
    ) {
        return ResponseEntity.ok(workService.readChapter(slug, chapterNumber, currentUserId));
    }
}
