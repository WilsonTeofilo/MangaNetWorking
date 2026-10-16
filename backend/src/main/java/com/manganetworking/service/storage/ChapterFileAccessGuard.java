package com.manganetworking.service.storage;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.service.session.SessionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Controle de acesso às páginas de capítulo servidas pelo storage.
 *
 * <p>As capas, banners e avatares são conteúdo público. Já as páginas de capítulo herdam o
 * controle de acesso do capítulo a que pertencem: capítulos em early access exigem assinatura
 * ativa do autor e obras suspensas ficam restritas ao autor e à moderação. Sem este guard, a URL
 * opaca do arquivo funcionaria como se fosse um controle de acesso — o que ela não é.</p>
 */
@Service
public class ChapterFileAccessGuard {

    private static final String STATUS_SUSPENDED = "suspended";

    private final ChapterRepository chapterRepository;
    private final MembershipSubscriptionRepository membershipRepository;

    public ChapterFileAccessGuard(
            ChapterRepository chapterRepository,
            MembershipSubscriptionRepository membershipRepository
    ) {
        this.chapterRepository = chapterRepository;
        this.membershipRepository = membershipRepository;
    }

    /**
     * Resultado do guard: se a leitura é permitida e se o conteúdo é privado (página de capítulo,
     * que não pode ser cacheada por CDN/proxy compartilhado).
     */
    public record AccessDecision(boolean allowed, boolean privateContent) {}

    /**
     * Decide se a requisição corrente pode ler o arquivo informado.
     * Arquivos que não são páginas de capítulo são tratados como públicos.
     */
    @Transactional(readOnly = true)
    public AccessDecision evaluate(String filename) {
        if (filename == null || filename.isBlank()) {
            return new AccessDecision(false, false);
        }

        Optional<ChapterEntity> chapterRef = chapterRepository.findFirstByPagesJsonContaining(filename);
        if (chapterRef.isEmpty()) {
            // Não é página de capítulo (capa/banner/avatar): conteúdo público.
            return new AccessDecision(true, false);
        }

        ChapterEntity chapter = chapterRef.get();
        WorkEntity work = chapter.getWork();
        CreatorEntity author = work != null ? work.getAuthor() : null;

        SessionService.UserSession session = SecurityContextUtils.getCurrentSession().orElse(null);
        UUID userId = session != null ? session.userId() : null;
        UUID sessionCreatorId = session != null ? session.creatorId() : null;
        boolean isModerator = session != null && session.isModerator();
        boolean isAuthor = sessionCreatorId != null && author != null && sessionCreatorId.equals(author.getId());

        // Obra suspensa cautelarmente: acessível apenas ao autor e à moderação.
        if (work != null && STATUS_SUSPENDED.equalsIgnoreCase(work.getStatus())) {
            return new AccessDecision(isAuthor || isModerator, true);
        }

        // Early access: acessível apenas ao autor ou a membro ativo do autor.
        if (chapter.isEarlyAccessForMembers()) {
            if (isAuthor) {
                return new AccessDecision(true, true);
            }
            if (userId == null || author == null) {
                return new AccessDecision(false, true);
            }
            boolean isActiveMember = membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                    userId, author.getId(), "ACTIVE", LocalDateTime.now());
            return new AccessDecision(isActiveMember, true);
        }

        return new AccessDecision(true, true);
    }

    /** Atalho booleano sobre {@link #evaluate(String)}. */
    @Transactional(readOnly = true)
    public boolean canRead(String filename) {
        return evaluate(filename).allowed();
    }
}
