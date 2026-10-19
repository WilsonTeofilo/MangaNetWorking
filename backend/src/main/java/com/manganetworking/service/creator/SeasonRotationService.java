package com.manganetworking.service.creator;

import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Vira a temporada e concede o boost algorítmico aos criadores mais lidos da temporada encerrada.
 *
 * <p>Idempotente por construção: a janela anterior é fixa e o boost é um {@code set} absoluto,
 * não um incremento. Rodar o job várias vezes no mesmo dia produz o mesmo resultado.</p>
 *
 * <p>Ranking: leitores únicos (eventos {@code READ}) nas obras do criador dentro da temporada.
 * É um join em memória entre Postgres (obras) e Mongo (eventos), adequado ao volume do MVP.</p>
 */
@Service
public class SeasonRotationService {

    private static final Logger log = LoggerFactory.getLogger(SeasonRotationService.class);
    private static final String READ_EVENT = "READ";
    private static final int MAX_WINNERS = 10;

    private final SeasonService seasonService;
    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final EngagementEventMongoRepository engagementEventRepository;

    public SeasonRotationService(
            SeasonService seasonService,
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            EngagementEventMongoRepository engagementEventRepository
    ) {
        this.seasonService = seasonService;
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.engagementEventRepository = engagementEventRepository;
    }

    /** Roda todo dia às 03:30 UTC; o resultado é o mesmo enquanto a temporada corrente não muda. */
    @Scheduled(cron = "0 30 3 * * *")
    @Transactional
    public void rotatePreviousSeasonRanking() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        SeasonService.SeasonWindow current = seasonService.currentSeason(today);
        SeasonService.SeasonWindow previous = seasonService.currentSeason(current.start().minusDays(1));

        Instant from = previous.start().atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant toExclusive = previous.end().plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        Map<String, UUID> workToCreator = new HashMap<>();
        for (WorkEntity work : workRepository.findAll()) {
            if (work.getId() != null && work.getAuthor() != null) {
                workToCreator.put(work.getId().toString(), work.getAuthor().getId());
            }
        }
        if (workToCreator.isEmpty()) {
            log.info("[SEASON] Nenhuma obra cadastrada; rotação da season {} ignorada.", previous.number());
            return;
        }

        List<EngagementEventDocument> events = engagementEventRepository
                .findByWorkIdInAndEventTypeAndTimestampAfter(workToCreator.keySet(), READ_EVENT, from);

        Map<UUID, Set<String>> readersByCreator = new HashMap<>();
        for (EngagementEventDocument event : events) {
            if (event.getTimestamp() == null || !event.getTimestamp().isBefore(toExclusive)) {
                continue;
            }
            UUID creatorId = workToCreator.get(event.getWorkId());
            if (creatorId == null || event.getUserId() == null) {
                continue;
            }
            readersByCreator.computeIfAbsent(creatorId, ignored -> new HashSet<>()).add(event.getUserId());
        }

        List<Map.Entry<UUID, Set<String>>> ranking = new ArrayList<>(readersByCreator.entrySet());
        ranking.removeIf(entry -> entry.getValue().isEmpty());
        ranking.sort((left, right) -> Integer.compare(right.getValue().size(), left.getValue().size()));

        if (ranking.isEmpty()) {
            log.info("[SEASON] Season {} sem leituras registradas; nenhum boost concedido.", previous.number());
            return;
        }

        int winners = Math.min(MAX_WINNERS, Math.max(1, (int) Math.ceil(ranking.size() * 0.2)));
        LocalDateTime boostUntil = current.end().atTime(23, 59, 59);

        for (int rank = 0; rank < winners; rank++) {
            UUID creatorId = ranking.get(rank).getKey();
            double boost = seasonService.boostForRank(rank, winners);
            creatorRepository.findById(creatorId).ifPresent(creator -> {
                creator.setEngagementBoostMul(boost);
                creator.setEngagementBoostUntil(boostUntil);
                creatorRepository.save(creator);
            });
        }

        log.info("[SEASON] Season {} encerrada. {} criador(es) premiado(s); boost válido até {}.",
                previous.number(), winners, boostUntil);
    }
}
