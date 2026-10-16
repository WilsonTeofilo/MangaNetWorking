package com.manganetworking.service.reading;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.nosql.ReadingProgressDocument;
import com.manganetworking.domain.relational.AdRevenueLedgerEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.AdRevenueLedgerRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.ReadingProgressMongoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;

/**
 * Progresso de leitura (MongoDB) e gatilho de anúncios a cada N páginas, com crédito
 * do split de receita publicitária na carteira do autor e no ledger de anúncios.
 * Todos os parâmetros de negócio vêm de {@link PlatformProperties} (nada fixo no código).
 */
@Service
public class ReadingProgressService {

    private static final Logger log = LoggerFactory.getLogger(ReadingProgressService.class);

    private final ReadingProgressMongoRepository progressMongoRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final CreatorRepository creatorRepository;
    private final AdRevenueLedgerRepository adRevenueLedgerRepository;
    private final UserRepository userRepository;
    private final PlatformProperties properties;

    public ReadingProgressService(
            ReadingProgressMongoRepository progressMongoRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            CreatorRepository creatorRepository,
            AdRevenueLedgerRepository adRevenueLedgerRepository,
            UserRepository userRepository,
            PlatformProperties properties
    ) {
        this.progressMongoRepository = progressMongoRepository;
        this.workRepository = workRepository;
        this.chapterRepository = chapterRepository;
        this.creatorRepository = creatorRepository;
        this.adRevenueLedgerRepository = adRevenueLedgerRepository;
        this.userRepository = userRepository;
        this.properties = properties;
    }

    /**
     * Salva o progresso de leitura em tempo real no MongoDB e gerencia o gatilho de anúncios a cada 30 páginas
     */
    @Transactional
    public ReadingProgressResult trackPageRead(
            String userId,
            String workId,
            String chapterId,
            int page,
            int totalPages
    ) {
        ReadingProgressDocument doc = progressMongoRepository.findByUserIdAndWorkId(userId, workId)
                .orElseGet(() -> {
                    ReadingProgressDocument newDoc = new ReadingProgressDocument();
                    newDoc.setUserId(userId);
                    newDoc.setWorkId(workId);
                    return newDoc;
                });

        doc.setChapterId(chapterId);
        doc.setPage(page);
        doc.setTotalPages(totalPages);
        doc.setUpdatedAt(Instant.now());

        // Incrementa páginas acumuladas
        int cumulative = (doc.getCumulativePagesRead() == null ? 0 : doc.getCumulativePagesRead()) + 1;
        boolean shouldTriggerAd = false;

        // Verifica se o usuário é assinante VIP (isento de 100% dos anúncios)
        boolean isVip = false;
        try {
            if (userId != null && !userId.isBlank()) {
                isVip = userRepository.findById(UUID.fromString(userId))
                        .map(UserEntity::isVipActive)
                        .orElse(false);
            }
        } catch (RuntimeException e) {
            // Melhor esforço: falha ao checar VIP não deve derrubar a leitura; assume não-VIP.
            log.warn("[ANÚNCIOS] Não foi possível verificar status VIP do usuário {}: {}", userId, e.getMessage());
        }

        int pagesPerAd = properties.getAds().getPagesPerAd();

        if (cumulative >= pagesPerAd) {
            cumulative = 0; // Reinicia o ciclo de páginas
            if (!isVip) {
                shouldTriggerAd = true;
                processAdImpression(workId);
            }
        }

        doc.setCumulativePagesRead(cumulative);
        progressMongoRepository.save(doc);

        return new ReadingProgressResult(doc, shouldTriggerAd);
    }

    private void processAdImpression(String workId) {
        try {
            UUID workUuid = UUID.fromString(workId);
            WorkEntity work = workRepository.findById(workUuid).orElse(null);
            if (work == null) return;

            CreatorEntity creator = work.getAuthor();
            if (creator == null || !creator.isMonetizationUnlocked()) {
                // Criador ainda não atingiu nível 2 de monetização
                return;
            }

            BigDecimal grossAd = properties.getAds().getCpmBrl();
            BigDecimal creatorShareRate = properties.getAds().getCreatorSharePercentage();
            int threshold = properties.getAds().getPagesPerAd();

            BigDecimal creatorShare = grossAd.multiply(creatorShareRate).setScale(4, RoundingMode.HALF_UP);
            BigDecimal platformShare = grossAd.subtract(creatorShare);

            // Credita na carteira do autor
            creator.setWalletBalanceBrl(creator.getWalletBalanceBrl().add(creatorShare));
            creatorRepository.save(creator);

            // Grava no Ledger de Anúncios
            AdRevenueLedgerEntity adLedger = new AdRevenueLedgerEntity();
            adLedger.setCreator(creator);
            adLedger.setWork(work);
            adLedger.setPagesReadThreshold(threshold);
            adLedger.setGrossAdValueBrl(grossAd);
            adLedger.setCreatorShareBrl(creatorShare);
            adLedger.setPlatformShareBrl(platformShare);
            adRevenueLedgerRepository.save(adLedger);

            log.info("[ANÚNCIOS] Anúncio disparado a cada {} páginas na obra '{}'. Bruto: R$ {}, Criador ({}): R$ {}, Plataforma: R$ {}",
                    threshold, work.getTitle(), grossAd, creatorShareRate, creatorShare, platformShare);
        } catch (Exception e) {
            log.error("[ANÚNCIOS] Erro ao processar divisão de anúncio: {}", e.getMessage());
        }
    }

    public record ReadingProgressResult(ReadingProgressDocument progress, boolean triggerAd) {}
}
