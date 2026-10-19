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
    public ResponseEntity<CreatorWorkspaceResponseDto> getCreatorWorkspace() {
        UUID creatorId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentCreatorId();
        return ResponseEntity.ok(creatorService.getCreatorWorkspace(creatorId));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateCreatorIdentity(
            @Valid @RequestBody UpdateCreatorIdentityRequestDto dto
    ) {
        UUID creatorId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentCreatorId();
        creatorService.updateCreatorIdentity(creatorId, dto);
        return ResponseEntity.ok(Map.of("message", "Perfil de autor atualizado com sucesso"));
    }

    @PutMapping("/pix-key")
    public ResponseEntity<Map<String, String>> updatePixKey(
            @Valid @RequestBody UpdatePixKeyRequestDto dto
    ) {
        UUID creatorId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentCreatorId();
        creatorService.updatePixKey(creatorId, dto);
        return ResponseEntity.ok(Map.of("message", "Chave PIX atualizada com sucesso"));
    }


    @PutMapping("/membership-price")
    public ResponseEntity<Map<String, Object>> updateMembershipPrice(
            @Valid @RequestBody UpdateMembershipPriceRequestDto dto
    ) {
        UUID creatorId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentCreatorId();
        BigDecimal updatedPrice = creatorService.updateMembershipPrice(creatorId, dto.priceBrl());
        return ResponseEntity.ok(Map.of(
                "message", "Preço de membros atualizado",
                "membershipPriceBrl", updatedPrice
        ));
    }

    @PostMapping("/workspace/missions/{missionId}/claim")
    public ResponseEntity<Map<String, Object>> claimMissionReward(
            @PathVariable String missionId
    ) {
        UUID creatorId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentCreatorId();
        CreatorEntity updatedCreator = creatorService.claimMissionReward(creatorId, missionId);
        return ResponseEntity.ok(Map.of(
                "message", "Recompensa da Season resgatada com sucesso!",
                "boostMultiplier", updatedCreator.getEngagementBoostMul(),
                "boostUntil", updatedCreator.getEngagementBoostUntil(),
                "monetizationLevel", updatedCreator.getMonetizationLevel()
        ));
    }
}
