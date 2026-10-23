package com.manganetworking.service.analytics;

import com.manganetworking.domain.enums.AnalyticsSurface;
import com.manganetworking.domain.nosql.EngagementEventDocument;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.EngagementEventMongoRepository;
import com.manganetworking.service.analytics.dto.TrackImpressionRequestDto;
import com.manganetworking.service.analytics.dto.TrackOpeningRequestDto;
import com.manganetworking.service.analytics.dto.TrackingAckDto;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Instrumentação de descoberta: impressão de card e abertura de obra.
 *
 * <p><b>Impressão</b> é o card que entrou na área visível (o cliente aplica 50% por ~1 s).
 * <b>Abertura</b> é o clique que levou à obra. Nenhum dos dois prova leitura: a
 * visualização válida continua sendo o evento {@code VIEW}, gravado quando a primeira
 * página é efetivamente alcançada. Assim o funil não confunde interesse com consumo.</p>
 *
 * <p>Todos os eventos usam chave de idempotência com escopo no usuário
 * ({@code userId:eventType:clientKey}); o índice único no MongoDB + o tratamento de
 * {@link DuplicateKeyException} tornam retry, re-render e reenvio inofensivos. O
 * {@code timestamp} é sempre do servidor — o cliente não envia relógio.</p>
 */
@Service
public class EngagementTrackingService {

    static final String IMPRESSION_EVENT = "IMPRESSION";
    static final String OPEN_EVENT = "OPEN";
    static final int EVENT_VERSION = 1;

    private final WorkRepository workRepository;
    private final EngagementEventMongoRepository engagementEventRepository;

    public EngagementTrackingService(
            WorkRepository workRepository,
            EngagementEventMongoRepository engagementEventRepository
    ) {
        this.workRepository = workRepository;
        this.engagementEventRepository = engagementEventRepository;
    }

    public TrackingAckDto trackImpressions(String userId, TrackImpressionRequestDto request) {
        requireUser(userId);
        List<TrackImpressionRequestDto.ImpressionDto> items = request.impressions();
        if (items == null || items.isEmpty()) {
            return TrackingAckDto.empty();
        }

        Map<UUID, WorkEntity> works = loadWorks(items.stream()
                .map(TrackImpressionRequestDto.ImpressionDto::workId)
                .toList());

        Instant now = Instant.now();
        List<EngagementEventDocument> candidates = new ArrayList<>(items.size());
        int rejected = 0;
        for (TrackImpressionRequestDto.ImpressionDto item : items) {
            AnalyticsSurface surface = requireSurface(item.surface());
            WorkEntity work = works.get(parseWorkId(item.workId()));
            if (work == null) {
                rejected++;
                continue;
            }
            candidates.add(buildEvent(
                    userId,
                    work,
                    IMPRESSION_EVENT,
                    surface,
                    userId + ":" + IMPRESSION_EVENT + ":" + item.impressionKey(),
                    now
            ));
        }
        return persist(candidates, rejected);
    }

    public TrackingAckDto trackOpening(String userId, TrackOpeningRequestDto request) {
        requireUser(userId);
        AnalyticsSurface surface = requireSurface(request.surface());
        WorkEntity work = workRepository.findById(parseWorkId(request.workId())).orElse(null);
        if (work == null) {
            return new TrackingAckDto(0, 0, 1);
        }
        EngagementEventDocument event = buildEvent(
                userId,
                work,
                OPEN_EVENT,
                surface,
                userId + ":" + OPEN_EVENT + ":" + request.openingKey(),
                Instant.now()
        );
        return persist(List.of(event), 0);
    }

    private TrackingAckDto persist(List<EngagementEventDocument> candidates, int rejected) {
        if (candidates.isEmpty()) {
            return new TrackingAckDto(0, 0, rejected);
        }
        List<String> keys = candidates.stream()
                .map(EngagementEventDocument::getIdempotencyKey)
                .toList();
        Set<String> existing = new HashSet<>(engagementEventRepository
                .findAllByIdempotencyKeyIn(keys)
                .stream()
                .map(EngagementEventDocument::getIdempotencyKey)
                .toList());

        int accepted = 0;
        int duplicates = 0;
        for (EngagementEventDocument event : candidates) {
            if (existing.contains(event.getIdempotencyKey())) {
                duplicates++;
                continue;
            }
            try {
                engagementEventRepository.save(event);
                accepted++;
            } catch (DuplicateKeyException race) {
                // Duas requisições simultâneas com a mesma chave: a segunda é reenvio.
                duplicates++;
            }
        }
        return new TrackingAckDto(accepted, duplicates, rejected);
    }

    private EngagementEventDocument buildEvent(
            String userId,
            WorkEntity work,
            String eventType,
            AnalyticsSurface surface,
            String idempotencyKey,
            Instant timestamp
    ) {
        EngagementEventDocument event = new EngagementEventDocument();
        event.setEventType(eventType);
        event.setUserId(userId);
        event.setWorkId(work.getId().toString());
        event.setCreatorId(work.getAuthor() != null && work.getAuthor().getId() != null
                ? work.getAuthor().getId().toString()
                : null);
        event.setSurface(surface.name());
        event.setIdempotencyKey(idempotencyKey);
        event.setEventVersion(EVENT_VERSION);
        event.setTimestamp(timestamp);
        return event;
    }

    private Map<UUID, WorkEntity> loadWorks(Collection<String> rawWorkIds) {
        List<UUID> ids = rawWorkIds.stream().map(this::parseWorkId).distinct().toList();
        Map<UUID, WorkEntity> works = new HashMap<>();
        for (WorkEntity work : workRepository.findAllById(ids)) {
            if (work.getId() != null) {
                works.put(work.getId(), work);
            }
        }
        return works;
    }

    private UUID parseWorkId(String raw) {
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException | NullPointerException exception) {
            throw new IllegalArgumentException("ID de obra inválido no evento de analytics.");
        }
    }

    private AnalyticsSurface requireSurface(String raw) {
        AnalyticsSurface surface = AnalyticsSurface.fromWire(raw);
        if (surface == null) {
            throw new IllegalArgumentException("Superfície de analytics desconhecida.");
        }
        return surface;
    }

    private void requireUser(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new IllegalArgumentException("Sessão autenticada é obrigatória para registrar eventos.");
        }
    }
}
