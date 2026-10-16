package com.manganetworking.controller;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.service.feed.FeedApplicationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feed")
public class FeedController {

    private final FeedApplicationService feedService;

    public FeedController(FeedApplicationService feedService) {
        this.feedService = feedService;
    }

    /**
     * Sincronização e recalculo do Feed no MongoDB
     */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('MODERATOR')")
    public ResponseEntity<Map<String, Object>> syncFeed() {
        int count = feedService.syncCatalog();
        return ResponseEntity.ok(Map.of(
                "message", "Feed sincronizado com sucesso no MongoDB.",
                "totalWorksSynced", count
        ));
    }

    /**
     * Endpoint Principal do Feed de Recomendação (Estilo YouTube / Facebook)
     * Responde em milissegundos direto do MongoDB com as obras já ordenadas pelo algoritmo.
     */
    @GetMapping
    public ResponseEntity<List<WorkFeedDocument>> getFeed(
            @RequestParam(defaultValue = "recommended") String sort,
            @RequestParam(required = false) String genre,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(feedService.getFeed(sort, genre, page, size));
    }

    /**
     * Obras em Alta (Trending)
     */
    @GetMapping("/trending")
    public ResponseEntity<List<WorkFeedDocument>> getTrending(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(feedService.getTrending(limit));
    }

    /**
     * Novos Capítulos / Lançamentos Recentes
     */
    @GetMapping("/fresh")
    public ResponseEntity<List<WorkFeedDocument>> getFreshReleases(@RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(feedService.getFreshReleases(limit));
    }
}
