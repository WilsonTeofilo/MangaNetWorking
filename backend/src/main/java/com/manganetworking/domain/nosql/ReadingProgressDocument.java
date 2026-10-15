package com.manganetworking.domain.nosql;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "reading_progress")
@CompoundIndex(name = "idx_user_work", def = "{'userId': 1, 'workId': 1}", unique = true)
public class ReadingProgressDocument {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String workId;
    private String workTitle;
    private String workCoverUrl;

    private String chapterId;
    private Integer chapterNumber;
    private String chapterTitle;

    private Integer page; // Em qual página o leitor parou
    private Integer totalPages;

    private Integer cumulativePagesRead = 0; // Contador acumulado para disparar anúncio a cada 30 páginas

    @Indexed
    private Instant updatedAt = Instant.now();

    public ReadingProgressDocument() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getWorkId() { return workId; }
    public void setWorkId(String workId) { this.workId = workId; }

    public String getWorkTitle() { return workTitle; }
    public void setWorkTitle(String workTitle) { this.workTitle = workTitle; }

    public String getWorkCoverUrl() { return workCoverUrl; }
    public void setWorkCoverUrl(String workCoverUrl) { this.workCoverUrl = workCoverUrl; }

    public String getChapterId() { return chapterId; }
    public void setChapterId(String chapterId) { this.chapterId = chapterId; }

    public Integer getChapterNumber() { return chapterNumber; }
    public void setChapterNumber(Integer chapterNumber) { this.chapterNumber = chapterNumber; }

    public String getChapterTitle() { return chapterTitle; }
    public void setChapterTitle(String chapterTitle) { this.chapterTitle = chapterTitle; }

    public Integer getPage() { return page; }
    public void setPage(Integer page) { this.page = page; }

    public Integer getTotalPages() { return totalPages; }
    public void setTotalPages(Integer totalPages) { this.totalPages = totalPages; }

    public Integer getCumulativePagesRead() { return cumulativePagesRead; }
    public void setCumulativePagesRead(Integer cumulativePagesRead) { this.cumulativePagesRead = cumulativePagesRead; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
