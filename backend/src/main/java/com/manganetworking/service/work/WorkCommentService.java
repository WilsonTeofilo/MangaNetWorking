package com.manganetworking.service.work;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkCommentEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkCommentRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.work.dto.WorkCommentResponseDto;
import com.manganetworking.util.SanitizationUtils;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Comentários da obra.
 *
 * <p>Segurança: o corpo é higienizado no servidor (sem tag, sem {@code javascript:}) e
 * persistido como texto puro — o front renderiza como texto, nunca como HTML. A listagem
 * respeita a privacidade do autor: perfil privado expõe apenas o username.</p>
 */
@Service
public class WorkCommentService {

    private static final int MAX_BODY_LENGTH = 1000;

    private final WorkCommentRepository commentRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final UserRepository userRepository;

    public WorkCommentService(
            WorkCommentRepository commentRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            UserRepository userRepository
    ) {
        this.commentRepository = commentRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<WorkCommentResponseDto> listComments(UUID workId, int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 100);
        return commentRepository.findAllByWorkIdOrderByCreatedAtDesc(workId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WorkCommentResponseDto createComment(UUID userId, UUID workId, UUID chapterId, String rawBody) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada"));

        String body = SanitizationUtils.stripAllHtml(rawBody == null ? "" : rawBody.trim());
        if (body.isBlank()) {
            throw new IllegalArgumentException("O comentário não pode ficar em branco.");
        }
        if (body.length() > MAX_BODY_LENGTH) {
            throw new IllegalArgumentException("O comentário deve ter no máximo " + MAX_BODY_LENGTH + " caracteres.");
        }

        ChapterEntity chapter = null;
        if (chapterId != null) {
            chapter = chapterRepository.findById(chapterId).orElse(null);
        }

        UserEntity author = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));

        WorkCommentEntity comment = new WorkCommentEntity();
        comment.setWork(work);
        comment.setChapter(chapter);
        comment.setUser(author);
        comment.setBody(body);
        commentRepository.save(comment);

        return toResponse(comment);
    }

    private WorkCommentResponseDto toResponse(WorkCommentEntity comment) {
        UserEntity author = comment.getUser();
        boolean profilePublic = author != null && author.isProfilePublic();
        return new WorkCommentResponseDto(
                comment.getId() != null ? comment.getId().toString() : "",
                author != null ? author.getUsername() : "",
                profilePublic && author != null ? author.getName() : null,
                profilePublic && author != null ? author.getAvatarUrl() : null,
                profilePublic,
                author != null && author.isCreator(),
                comment.getBody(),
                comment.getCreatedAt());
    }
}
