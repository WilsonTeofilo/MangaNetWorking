package com.manganetworking.controller;

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
    public ResponseEntity<CreatorWorkspaceResponseDto> getCreatorWorkspace(@RequestHeader("X-Creator-Id") UUID creatorId) {
        return ResponseEntity.ok(creatorService.getCreatorWorkspace(creatorId));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateCreatorIdentity(
            @RequestHeader("X-Creator-Id") UUID creatorId,
            @Valid @RequestBody UpdateCreatorIdentityRequestDto dto
    ) {
        creatorService.updateCreatorIdentity(creatorId, dto);
        return ResponseEntity.ok(Map.of("message", "Perfil de autor atualizado com sucesso"));
    }

    @PutMapping("/membership-price")
    public ResponseEntity<Map<String, Object>> updateMembershipPrice(
            @RequestHeader("X-Creator-Id") UUID creatorId,
            @Valid @RequestBody UpdateMembershipPriceRequestDto dto
    ) {
        BigDecimal updatedPrice = creatorService.updateMembershipPrice(creatorId, dto.priceBrl());
        return ResponseEntity.ok(Map.of(
                "message", "Preço de membros atualizado",
                "membershipPriceBrl", updatedPrice
        ));
    }
}
