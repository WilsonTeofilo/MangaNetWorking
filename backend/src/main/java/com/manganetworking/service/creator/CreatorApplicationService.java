package com.manganetworking.service.creator;

import com.manganetworking.config.exception.ResourceNotFoundException;
import com.manganetworking.domain.nosql.CreatorMissionDocument;
import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.WorkEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.WorkRepository;
import com.manganetworking.repository.mongo.CreatorMissionMongoRepository;
import com.manganetworking.service.MonetizationService;
import com.manganetworking.service.creator.dto.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
public class CreatorApplicationService {

    private final CreatorRepository creatorRepository;
    private final WorkRepository workRepository;
    private final CreatorMissionMongoRepository missionRepository;
    private final MonetizationService monetizationService;

    public CreatorApplicationService(
            CreatorRepository creatorRepository,
            WorkRepository workRepository,
            CreatorMissionMongoRepository missionRepository,
            MonetizationService monetizationService
    ) {
        this.creatorRepository = creatorRepository;
        this.workRepository = workRepository;
        this.missionRepository = missionRepository;
        this.monetizationService = monetizationService;
    }

    @Transactional(readOnly = true)
    public CreatorPublicProfileResponseDto getPublicCreatorProfile(String handle) {
        String cleanHandle = handle.startsWith("@") ? handle.substring(1) : handle;
        CreatorEntity creator = creatorRepository.findByHandle(cleanHandle)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado: @" + cleanHandle));

        List<WorkEntity> works = workRepository.findAllByAuthorId(creator.getId());

        List<CreatorWorkSummaryDto> worksDto = works.stream()
                .map(w -> new CreatorWorkSummaryDto(
                        w.getId(),
                        w.getTitle(),
                        w.getSlug(),
                        w.getSynopsis(),
                        w.getCoverUrl(),
                        w.getTotalChapters(),
                        w.getTotalViews(),
                        w.getTotalLikes()
                ))
                .toList();

        return new CreatorPublicProfileResponseDto(
                creator.getId(),
                creator.getUser() != null ? creator.getUser().getName() : creator.getHandle(),
                "@" + creator.getHandle(),
                creator.getBio(),
                creator.getAvatarUrl(),
                creator.getInstagramUrl(),
                creator.getYoutubeUrl(),
                creator.getPortfolioUrl(),
                creator.getMembershipPriceBrl(),
                creator.isMonetizationUnlocked(),
                worksDto
        );
    }

    @Transactional(readOnly = true)
    public CreatorWorkspaceResponseDto getCreatorWorkspace(UUID creatorId) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        List<CreatorMissionDocument> missions = missionRepository.findAllByCreatorId(creator.getId().toString());

        return new CreatorWorkspaceResponseDto(
                creator.getId(),
                creator.getUser() != null ? creator.getUser().getName() : creator.getHandle(),
                "@" + creator.getHandle(),
                creator.getMonetizationLevel(),
                creator.isMonetizationUnlocked(),
                creator.getWalletBalanceBrl(),
                creator.getTotalDonationsBrl(),
                creator.getMonthlyMembersCount(),
                creator.getMembershipPriceBrl(),
                creator.getPixKey(),
                creator.getPixKeyType(),
                creator.hasActiveBoost(),
                creator.getEngagementBoostMul(),
                missions
        );
    }

    @Transactional
    public void updateCreatorIdentity(UUID creatorId, UpdateCreatorIdentityRequestDto dto) {
        CreatorEntity creator = creatorRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Criador não encontrado"));

        if (dto.name() != null && !dto.name().isBlank() && creator.getUser() != null) {
            creator.getUser().setName(dto.name().trim());
        }
        if (dto.bio() != null) creator.setBio(dto.bio().trim());
        if (dto.instagramUrl() != null) creator.setInstagramUrl(dto.instagramUrl().trim());
        if (dto.youtubeUrl() != null) creator.setYoutubeUrl(dto.youtubeUrl().trim());
        if (dto.portfolioUrl() != null) creator.setPortfolioUrl(dto.portfolioUrl().trim());
        if (dto.avatarUrl() != null) creator.setAvatarUrl(dto.avatarUrl().trim());

        creatorRepository.save(creator);
    }

    @Transactional
    public BigDecimal updateMembershipPrice(UUID creatorId, BigDecimal newPriceBrl) {
        CreatorEntity updated = monetizationService.updateMembershipPrice(creatorId, newPriceBrl);
        return updated.getMembershipPriceBrl();
    }
}
