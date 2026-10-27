package com.manganetworking.service.mobile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.manganetworking.config.exception.AccessDeniedException;
import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.enums.WorkStatus;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.MembershipSubscriptionRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.service.mobile.dto.OfflineDownloadManifestDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class MobileOfflineApplicationService {

    private static final Logger log = LoggerFactory.getLogger(MobileOfflineApplicationService.class);



    private final UserRepository userRepository;
    private final ChapterRepository chapterRepository;
    private final MembershipSubscriptionRepository membershipRepository;
    private final ObjectMapper objectMapper;

    public MobileOfflineApplicationService(
            UserRepository userRepository,
            ChapterRepository chapterRepository,
            MembershipSubscriptionRepository membershipRepository,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.chapterRepository = chapterRepository;
        this.membershipRepository = membershipRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Emite o manifesto criptografado para download offline exclusivo para assinantes VIP da plataforma.
     * Garante que capítulos de membros de criadores ainda exijam membership ativo do autor.
     */
    @Transactional(readOnly = true)
    public OfflineDownloadManifestDto generateOfflineManifest(UUID currentUserId, UUID chapterId) {
        if (currentUserId == null) {
            throw new AccessDeniedException("É necessário estar autenticado para utilizar o recurso de Leitura Offline.");
        }

        UserEntity user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado: " + currentUserId));

        // 1. Validação Obrigatória: Apenas assinantes VIP têm direito ao download offline
        if (!user.isVipActive()) {
            throw new AccessDeniedException(
                    "O recurso de Leitura Offline é exclusivo para assinantes VIP MangaNetWorking. " +
                    "Assine o VIP por R$ 23,00 / 30 dias para destravar downloads e leitura sem anúncios."
            );
        }

        ChapterEntity chapter = chapterRepository.findById(chapterId)
                .orElseThrow(() -> new ResourceNotFoundException("Capítulo não encontrado: " + chapterId));

        WorkEntity work = chapter.getWork();
        CreatorEntity author = work.getAuthor();

        // 2. Obra suspensa cautelarmente: indisponível para download por leitores.
        if (work.getStatus() == WorkStatus.SUSPENDED) {
            throw new AccessDeniedException("Esta obra está suspensa cautelarmente e não pode ser baixada.");
        }

        // 3. Validação de Integridade Editorial: Se o capítulo for Early Access, VIP NÃO dá bypass!
        // O usuário precisa ser membro ativo do autor para poder baixar o capítulo antecipado.
        if (chapter.isEarlyAccessForMembers()) {
            boolean isMember = false;
            if (author != null) {
                isMember = membershipRepository.existsBySubscriberIdAndCreatorIdAndStatusAndExpiresAtAfter(
                        currentUserId, author.getId(), "ACTIVE", LocalDateTime.now()
                );
            }

            if (!isMember) {
                throw new AccessDeniedException(
                        "Este capítulo está em Acesso Antecipado. " +
                        "A assinatura VIP da plataforma não substitui o Clube de Membros do autor @" +
                        (author != null ? author.getHandle() : "") + ". Seja membro para baixar este lançamento."
                );
            }
        }

        // 4. Desserializar páginas do capítulo
        List<String> pages;
        String pagesJson = chapter.getPagesJson();
        if (pagesJson == null || pagesJson.isBlank()) {
            log.warn("[MOBILE OFFLINE] Capítulo {} (obra {}) sem pagesJson; manifesto sairá sem páginas.",
                    chapter.getId(), work.getId());
            pages = Collections.emptyList();
        } else {
            try {
                pages = objectMapper.readValue(pagesJson, new TypeReference<List<String>>() {});
            } catch (JsonProcessingException | RuntimeException e) {
                // Manifesto sem páginas é melhor que derrubar o download; registra para investigar o dado corrompido.
                log.warn("[MOBILE OFFLINE] pagesJson inválido no capítulo {} (obra {}): {}",
                        chapter.getId(), work.getId(), e.getMessage());
                pages = Collections.emptyList();
            }
        }

        // 5. Gerar chave/token efêmero para criptografia local no sandbox do aplicativo móvel
        String encryptionKeyId = UUID.randomUUID().toString();

        log.info("[MOBILE OFFLINE] Manifesto de download emitido para usuário VIP {} - Obra: '{}', Cap: #{}",
                user.getId(), work.getTitle(), chapter.getChapterNumber());

        return new OfflineDownloadManifestDto(
                chapter.getId(),
                work.getTitle(),
                chapter.getChapterNumber(),
                chapter.getTitle(),
                pages,
                encryptionKeyId,
                true, // requiresSecureWindow: obriga o app móvel a ativar FLAG_SECURE
                user.getVipExpiresAt(),
                "MangaNetWorking DRM: Conteúdo protegido para leitura offline exclusiva neste dispositivo. Proibida a redistribuição."
        );
    }
}
