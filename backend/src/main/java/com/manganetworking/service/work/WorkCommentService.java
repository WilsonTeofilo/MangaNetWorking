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
import com.manganetworking.service.work.dto.CreateCommentRequestDto;
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

    /** Quantidade maxima de comentarios devolvidos em uma pagina. */
    private static final int MAX_PAGE_SIZE = 100;
    /** Quantidade minima de comentarios devolvidos em uma pagina. */
    private static final int MIN_PAGE_SIZE = 1;

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
        int safeLimit = Math.min(Math.max(limit, MIN_PAGE_SIZE), MAX_PAGE_SIZE);
        return commentRepository.findAllByWorkIdOrderByCreatedAtDesc(workId, PageRequest.of(0, safeLimit))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public WorkCommentResponseDto createComment(UUID userId, UUID workId, UUID chapterId, String rawBody) {
        WorkEntity work = workRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Obra não encontrada"));

        // Só obra publicada recebe comentário: comentar num rascunho (ou arquivada pela LGPD)
        // revelaria a existência de conteúdo que o autor ainda não publicou.
        if (!"ongoing".equalsIgnoreCase(work.getStatus()) && !"completed".equalsIgnoreCase(work.getStatus())) {
            throw new IllegalArgumentException("Esta obra ainda não está disponível para comentários.");
        }

        String body = SanitizationUtils.stripAllHtml(rawBody == null ? "" : rawBody.trim());
        if (body.isBlank()) {
            throw new IllegalArgumentException("O comentário não pode ficar em branco.");
        }
        if (body.length() > CreateCommentRequestDto.MAX_LENGTH) {
            throw new IllegalArgumentException("O comentário deve ter no máximo " + CreateCommentRequestDto.MAX_LENGTH + " caracteres.");
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
