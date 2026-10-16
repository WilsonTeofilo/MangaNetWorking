package com.manganetworking.controller;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.service.creator.CreatorApplicationService;
import com.manganetworking.service.creator.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/creators")
public class CreatorController {

    private final CreatorApplicationService creatorService;

    public CreatorController(CreatorApplicationService creatorService) {
        this.creatorService = creatorService;
    }

    @GetMapping("/{handle}")
    public ResponseEntity<CreatorPublicProfileResponseDto> getPublicCreatorProfile(@PathVariable String handle) {
        return ResponseEntity.ok(creatorService.getPublicCreatorProfile(handle));
    }

    @GetMapping("/workspace")
    public ResponseEntity<CreatorWorkspaceResponseDto> getCreatorWorkspace(
            @RequestHeader(value = "X-Creator-Id", required = false) UUID creatorId
    ) {
        UUID effectiveCreatorId = com.manganetworking.config.security.SecurityContextUtils.resolveCurrentCreatorId(creatorId);
        return ResponseEntity.ok(creatorService.getCreatorWorkspace(effectiveCreatorId));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateCreatorIdentity(
            @RequestHeader(value = "X-Creator-Id", required = false) UUID creatorId,
            @Valid @RequestBody UpdateCreatorIdentityRequestDto dto
    ) {
        UUID effectiveCreatorId = com.manganetworking.config.security.SecurityContextUtils.resolveCurrentCreatorId(creatorId);
        creatorService.updateCreatorIdentity(effectiveCreatorId, dto);
        return ResponseEntity.ok(Map.of("message", "Perfil de autor atualizado com sucesso"));
    }

    @PutMapping("/membership-price")
    public ResponseEntity<Map<String, Object>> updateMembershipPrice(
            @RequestHeader(value = "X-Creator-Id", required = false) UUID creatorId,
            @Valid @RequestBody UpdateMembershipPriceRequestDto dto
    ) {
        UUID effectiveCreatorId = com.manganetworking.config.security.SecurityContextUtils.resolveCurrentCreatorId(creatorId);
        BigDecimal updatedPrice = creatorService.updateMembershipPrice(effectiveCreatorId, dto.priceBrl());
        return ResponseEntity.ok(Map.of(
                "message", "Preço de membros atualizado",
                "membershipPriceBrl", updatedPrice
        ));
    }

    @PostMapping("/workspace/missions/{missionId}/claim")
    public ResponseEntity<Map<String, Object>> claimMissionReward(
            @RequestHeader(value = "X-Creator-Id", required = false) UUID creatorId,
            @PathVariable String missionId
    ) {
        UUID effectiveCreatorId = com.manganetworking.config.security.SecurityContextUtils.resolveCurrentCreatorId(creatorId);
        CreatorEntity updatedCreator = creatorService.claimMissionReward(effectiveCreatorId, missionId);
        return ResponseEntity.ok(Map.of(
                "message", "Recompensa da Season resgatada com sucesso!",
                "boostMultiplier", updatedCreator.getEngagementBoostMul(),
                "boostUntil", updatedCreator.getEngagementBoostUntil(),
                "monetizationLevel", updatedCreator.getMonetizationLevel()
        ));
    }
}
