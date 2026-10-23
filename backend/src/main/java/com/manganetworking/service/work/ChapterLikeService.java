package com.manganetworking.service.work;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.repository.jpa.ChapterLikeRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.service.user.dto.ToggleLikeResponseDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Curtida de capítulo (coração). É a única curtida de conteúdo: a obra exibe a
 * soma das curtidas de todos os seus capítulos.
 *
 * <p>A linha em {@code chapter_likes} é a fonte da verdade; {@code chapters.likes}
 * e {@code works.total_likes} só mudam quando a inserção/remoção aconteceu de fato.</p>
 */
@Service
public class ChapterLikeService {

    private final ChapterLikeRepository chapterLikeRepository;
    private final ChapterRepository chapterRepository;
    private final WorkRepository workRepository;
    private final UserRepository userRepository;

    public ChapterLikeService(
            ChapterLikeRepository chapterLikeRepository,
            ChapterRepository chapterRepository,
            WorkRepository workRepository,
            UserRepository userRepository
    ) {
        this.chapterLikeRepository = chapterLikeRepository;
        this.chapterRepository = chapterRepository;
        this.workRepository = workRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ToggleLikeResponseDto toggle(UUID userId, UUID workId, int chapterNumber) {
        ChapterEntity chapter = chapterRepository.findByWorkIdAndChapterNumber(workId, chapterNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado."));
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Usuário não encontrado.");
        }

        UUID chapterId = chapter.getId();
        boolean liked = chapterLikeRepository.existsByUser_IdAndChapter_Id(userId, chapterId);
        if (liked) {
            int removed = chapterLikeRepository.deleteByUserAndChapter(userId, chapterId);
            if (removed > 0) {
                chapterRepository.decrementLikes(chapterId);
                workRepository.decrementTotalLikes(workId);
            }
            liked = false;
        } else {
            int inserted = chapterLikeRepository.insertIfAbsent(UUID.randomUUID(), userId, chapterId);
            if (inserted > 0) {
                chapterRepository.incrementLikes(chapterId);
                workRepository.incrementTotalLikes(workId);
            }
            liked = true;
        }

        Long total = chapterRepository.findLikes(chapterId);
        return new ToggleLikeResponseDto(liked, total == null ? 0L : total);
    }
}
