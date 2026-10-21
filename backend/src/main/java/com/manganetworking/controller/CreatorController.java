package com.manganetworking.controller;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.service.creator.CreatorApplicationService;
import com.manganetworking.service.creator.dto.*;
import com.manganetworking.service.work.dto.CreatorWorkSummaryResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/creators")
public class CreatorController {

    private final CreatorApplicationService creatorService;
    private final com.manganetworking.repository.jpa.UserRepository userRepository;
    private final com.manganetworking.service.session.SessionService sessionService;
    private final com.manganetworking.service.creator.CreatorFollowService followService;

    public CreatorController(CreatorApplicationService creatorService,
                              com.manganetworking.service.creator.CreatorFollowService followService,
                              com.manganetworking.repository.jpa.UserRepository userRepository,
                              com.manganetworking.service.session.SessionService sessionService) {
        this.creatorService = creatorService;
        this.userRepository = userRepository;
        this.sessionService = sessionService;
        this.followService = followService;
    }

    @GetMapping("/{handle}")
    public ResponseEntity<CreatorPublicProfileResponseDto> getPublicCreatorProfile(@PathVariable String handle) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(creatorService.getPublicCreatorProfile(handle));
    }

    /**
     * Transição de leitor para escritor: exige pelo menos um vínculo social.
     * A conta continua sendo a mesma — só nasce o perfil público de escritor.
     */
    @PostMapping("/apply")
    public ResponseEntity<Map<String, Object>> applyAsWriter(
            @Valid @RequestBody ApplyAsCreatorRequestDto dto,
            HttpServletResponse response
    ) {
        UUID userId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentUserId();
        var creator = creatorService.applyAsWriter(userId, dto);

        // A sessao foi criada no login, antes do papel de escritor existir. Sem renovar aqui,
        // a pessoa continuaria com as janelas de leitor e tomaria 403 nos endpoints de autor
        // ate deslogar e logar de novo.
        var user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            sessionService.createSession(user, creator, response);
        }

        return ResponseEntity.ok(Map.of(
                "message", "Perfil de escritor criado.",
                "creatorId", creator.getId().toString(),
                "creatorHandle", creator.getHandle(),
                "reissuedSession", true));
    }

    /** Seguir um escritor (só escritores têm seguidores). */
    @PostMapping("/{handle}/follow")
    public ResponseEntity<Map<String, Object>> followCreator(@PathVariable String handle) {
        UUID userId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentUserId();
        long followers = followService.follow(userId, handle);
        return ResponseEntity.ok(Map.of("followers", followers, "following", true));
    }

    /** Deixar de seguir. */
    @DeleteMapping("/{handle}/follow")
    public ResponseEntity<Map<String, Object>> unfollowCreator(@PathVariable String handle) {
        UUID userId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentUserId();
        long followers = followService.unfollow(userId, handle);
        return ResponseEntity.ok(Map.of("followers", followers, "following", false));
    }

    @GetMapping("/{handle}/followers")
    public ResponseEntity<Map<String, Object>> countFollowers(@PathVariable String handle) {
        return ResponseEntity.ok(Map.of("followers", followService.countFollowers(handle)));
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
            @Valid @RequestBody UpdatePixKeyRequestDto dto,
            HttpServletRequest request
    ) {
        UUID creatorId = com.manganetworking.config.security.SecurityContextUtils.requireCurrentCreatorId();
        creatorService.updatePixKey(creatorId, dto, request.getRemoteAddr());
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
