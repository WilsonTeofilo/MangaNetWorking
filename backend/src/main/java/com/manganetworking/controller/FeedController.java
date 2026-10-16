package com.manganetworking.controller;

import com.manganetworking.domain.nosql.WorkFeedDocument;
import com.manganetworking.repository.mongo.WorkFeedMongoRepository;
import com.manganetworking.service.recommendation.RecommendationAlgorithmService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feed")
public class FeedController {

    private final WorkFeedMongoRepository workFeedMongoRepository;
    private final RecommendationAlgorithmService algorithmService;

    public FeedController(
            WorkFeedMongoRepository workFeedMongoRepository,
            RecommendationAlgorithmService algorithmService
    ) {
        this.workFeedMongoRepository = workFeedMongoRepository;
        this.algorithmService = algorithmService;
    }

    /**
     * Sincronização e recalculo do Feed no MongoDB
     */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncFeed() {
        int count = algorithmService.syncAllWorksToFeed();
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
        Pageable pageable = PageRequest.of(page, size);
        List<WorkFeedDocument> result;

        if (genre != null && !genre.isBlank() && !genre.equalsIgnoreCase("TODOS")) {
            result = workFeedMongoRepository.findAllByGenresContainingOrderByDiscoveryScoreDesc(genre.toUpperCase(), pageable);
            return ResponseEntity.ok(result);
        }

        switch (sort.toLowerCase()) {
            case "trending" -> result = workFeedMongoRepository.findAllByOrderByTrendingScoreDesc(pageable);
            case "fresh" -> result = workFeedMongoRepository.findAllByOrderByUpdatedAtDesc(pageable);
            default -> result = workFeedMongoRepository.findAllByOrderByDiscoveryScoreDesc(pageable); // Recommended
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Obras em Alta (Trending)
     */
    @GetMapping("/trending")
    public ResponseEntity<List<WorkFeedDocument>> getTrending(@RequestParam(defaultValue = "10") int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return ResponseEntity.ok(workFeedMongoRepository.findAllByOrderByTrendingScoreDesc(pageable));
    }

    /**
     * Novos Capítulos / Lançamentos Recentes
     */
    @GetMapping("/fresh")
    public ResponseEntity<List<WorkFeedDocument>> getFreshReleases(@RequestParam(defaultValue = "10") int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        return ResponseEntity.ok(workFeedMongoRepository.findAllByOrderByUpdatedAtDesc(pageable));
    }
}
