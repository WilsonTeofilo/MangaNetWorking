package com.manganetworking.domain.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "creator_missions")
public class CreatorMissionDocument {

    @Id
    private String id;

    @Indexed
    private String creatorId;

    private String title;
    private String description;

    private Integer currentProgress = 0;
    private Integer targetGoal = 1;
    private boolean completed = false;

    // Recompensa de Boost no Algoritmo de Descoberta (1.2x a 2.2x)
    private Double boostRewardMultiplier = 1.5;
    private Integer boostDurationHours = 48;

    private Instant completedAt;
    private Instant createdAt = Instant.now();

    public CreatorMissionDocument() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCreatorId() { return creatorId; }
    public void setCreatorId(String creatorId) { this.creatorId = creatorId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getCurrentProgress() { return currentProgress; }
    public void setCurrentProgress(Integer currentProgress) { this.currentProgress = currentProgress; }

    public Integer getTargetGoal() { return targetGoal; }
    public void setTargetGoal(Integer targetGoal) { this.targetGoal = targetGoal; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public Double getBoostRewardMultiplier() { return boostRewardMultiplier; }
    public void setBoostRewardMultiplier(Double boostRewardMultiplier) { this.boostRewardMultiplier = boostRewardMultiplier; }

    public Integer getBoostDurationHours() { return boostDurationHours; }
    public void setBoostDurationHours(Integer boostDurationHours) { this.boostDurationHours = boostDurationHours; }

    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
