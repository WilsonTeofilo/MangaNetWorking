package com.manganetworking.controller;

import com.manganetworking.config.security.SecurityContextUtils;
import com.manganetworking.service.user.UserProfileApplicationService;
import com.manganetworking.service.user.dto.*;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileApplicationService profileService;

    public UserProfileController(UserProfileApplicationService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/{userId}/profile")
    public ResponseEntity<ReaderProfileResponseDto> getReaderProfile(@PathVariable UUID userId) {
        return ResponseEntity.ok(profileService.getReaderProfile(userId, SecurityContextUtils.requireCurrentUserId()));
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, String>> updateProfile(
            @Valid @RequestBody UpdateProfileRequestDto dto
    ) {
        profileService.updateProfile(SecurityContextUtils.requireCurrentUserId(), dto);
        return ResponseEntity.ok(Map.of("message", "Perfil atualizado com sucesso"));
    }

    @PostMapping("/library/{workId}/toggle")
    public ResponseEntity<ToggleLikeResponseDto> toggleLikeWork(@PathVariable UUID workId) {
        return ResponseEntity.ok(profileService.toggleLikeWork(SecurityContextUtils.requireCurrentUserId(), workId));
    }

    @GetMapping("/reading-progress")
    public ResponseEntity<List<ReadingProgressResponseDto>> getReadingHistory() {
        // Identidade apenas pela sessão (a rota exige autenticação): sem fallback de header.
        return ResponseEntity.ok(profileService.getReadingHistory(SecurityContextUtils.requireCurrentUserId().toString()));
    }

    @PostMapping("/reading-progress/track")
    public ResponseEntity<TrackPageResponseDto> trackPage(@Valid @RequestBody TrackPageRequestDto dto) {
        return ResponseEntity.ok(profileService.trackPage(SecurityContextUtils.requireCurrentUserId().toString(), dto));
    }

    @GetMapping("/me/export")
    public ResponseEntity<UserDataExportDto> exportMyData() {
        return ResponseEntity.ok(profileService.exportUserData(SecurityContextUtils.requireCurrentUserId()));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> deleteAccount() {
        profileService.deleteUserAccountLgpd(SecurityContextUtils.requireCurrentUserId());
        return ResponseEntity.ok(Map.of(
                "message", "Conta anonimizada e dados pessoais removidos com sucesso em conformidade com a LGPD."
        ));
    }
}
