package com.manganetworking.domain.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "engagement_events")
@CompoundIndex(name = "idx_events_work_timestamp", def = "{'workId': 1, 'timestamp': -1}")
@CompoundIndex(name = "idx_events_work_type_timestamp", def = "{'workId': 1, 'eventType': 1, 'timestamp': -1}")
@CompoundIndex(name = "idx_events_user_chapter_type", def = "{'userId': 1, 'chapterId': 1, 'eventType': 1}")
public class EngagementEventDocument {

    @Id
    private String id;

    @Indexed
    private String eventType; // VIEW, READ, IMPRESSION, OPEN, LIKE, COMMENT, DONATE_CLICK, MEMBER_CLICK, READ_COMPLETE

    @Indexed
    private String userId;

    @Indexed
    private String workId;

    @Indexed
    private String chapterId;

    @Indexed
    private String creatorId;

    private Integer readPage;
    private Integer durationSeconds;
    private Map<String, Object> metadata;

    /**
     * Categoria fechada de origem ({@link com.manganetworking.domain.enums.AnalyticsSurface}).
     * Usada por {@code IMPRESSION} e {@code OPEN}; nula nos eventos de leitura.
     */
    private String surface;

    /**
     * Chave de idempotência de eventos de descoberta ({@code IMPRESSION}/{@code OPEN}).
     * O índice único impede que retry, re-render ou reenvio do cliente dupliquem o evento.
     */
    @Indexed(unique = true, sparse = true)
    private String idempotencyKey;

    /** Versão do contrato do evento; permite evoluir a semântica sem reinterpretar o passado. */
    private Integer eventVersion = 1;

    // TTL de 180 dias: o analytics usa no máximo 90 dias e a Season 60.
    // Sem isso, um documento por página lida cresce sem limite no Mongo.
    @Indexed(expireAfter = "180d")
    private Instant timestamp = Instant.now();

    public EngagementEventDocument() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getWorkId() { return workId; }
    public void setWorkId(String workId) { this.workId = workId; }

    public String getChapterId() { return chapterId; }
    public void setChapterId(String chapterId) { this.chapterId = chapterId; }

    public String getCreatorId() { return creatorId; }
    public void setCreatorId(String creatorId) { this.creatorId = creatorId; }

    public Integer getReadPage() { return readPage; }
    public void setReadPage(Integer readPage) { this.readPage = readPage; }

    public Integer getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(Integer durationSeconds) { this.durationSeconds = durationSeconds; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public String getSurface() { return surface; }
    public void setSurface(String surface) { this.surface = surface; }

    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }

    public Integer getEventVersion() { return eventVersion; }
    public void setEventVersion(Integer eventVersion) { this.eventVersion = eventVersion; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
