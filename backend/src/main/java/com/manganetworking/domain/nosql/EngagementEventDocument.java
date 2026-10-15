package com.manganetworking.domain.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Document(collection = "engagement_events")
public class EngagementEventDocument {

    @Id
    private String id;

    @Indexed
    private String eventType; // VIEW, LIKE, COMMENT, DONATE_CLICK, MEMBER_CLICK, READ_COMPLETE

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

    @Indexed
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

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}
