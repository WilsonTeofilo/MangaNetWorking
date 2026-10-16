package com.manganetworking.service;

import com.manganetworking.domain.nosql.ReadingProgressDocument;
import com.manganetworking.domain.relational.AdRevenueLedgerEntity;
import com.manganetworking.domain.relational.ChapterEntity;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.AdRevenueLedgerRepository;
import com.manganetworking.repository.jpa.ChapterRepository;
import com.manganetworking.repository.jpa.CreatorRepository;
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

@Service
public class ReadingProgressService {

    private static final Logger log = LoggerFactory.getLogger(ReadingProgressService.class);
    private static final int PAGES_PER_AD = 30; // Exibe anúncio a cada 30 páginas
    private static final BigDecimal DEFAULT_AD_CPM_BRL = new BigDecimal("0.05"); // R$ 0,05 por exibição (exemplo)
    private static final BigDecimal CREATOR_AD_SHARE_RATE = new BigDecimal("0.58"); // 58% para o criador
    private static final BigDecimal PLATFORM_AD_SHARE_RATE = new BigDecimal("0.42"); // 42% para a MangaNetWorking

    private final ReadingProgressMongoRepository progressMongoRepository;
    private final WorkRepository workRepository;
    private final ChapterRepository chapterRepository;
    private final CreatorRepository creatorRepository;
    private final AdRevenueLedgerRepository adRevenueLedgerRepository;
    private final com.manganetworking.repository.jpa.UserRepository userRepository;
    private final com.manganetworking.config.properties.PlatformProperties properties;

    public ReadingProgressService(
            ReadingProgressMongoRepository progressMongoRepository,
            WorkRepository workRepository,
            ChapterRepository chapterRepository,
            CreatorRepository creatorRepository,
            AdRevenueLedgerRepository adRevenueLedgerRepository,
            com.manganetworking.repository.jpa.UserRepository userRepository,
            com.manganetworking.config.properties.PlatformProperties properties
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
                        .map(com.manganetworking.domain.relational.UserEntity::isVipActive)
                        .orElse(false);
            }
        } catch (Exception ignored) {}

        int pagesPerAd = (properties != null && properties.getAds() != null)
                ? properties.getAds().getPagesPerAd()
                : PAGES_PER_AD;

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

            BigDecimal grossAd = (properties != null && properties.getAds() != null)
                    ? properties.getAds().getCpmBrl()
                    : DEFAULT_AD_CPM_BRL;

            BigDecimal creatorShareRate = (properties != null && properties.getAds() != null)
                    ? properties.getAds().getCreatorSharePercentage()
                    : CREATOR_AD_SHARE_RATE;

            int threshold = (properties != null && properties.getAds() != null)
                    ? properties.getAds().getPagesPerAd()
                    : PAGES_PER_AD;

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

            log.info("[ANÚNCIOS 30 PÁGINAS] Anúncio disparado para obra {}. Criador (58%): R$ {}, Plataforma (42%): R$ {}",
                    work.getTitle(), creatorShare, platformShare);
        } catch (Exception e) {
            log.error("[ANÚNCIOS] Erro ao processar divisão de anúncio: {}", e.getMessage());
        }
    }

    public record ReadingProgressResult(ReadingProgressDocument progress, boolean triggerAd) {}
}
