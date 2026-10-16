package com.manganetworking.controller;

import com.manganetworking.service.auth.AuthApplicationService;
import com.manganetworking.service.auth.dto.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthApplicationService authService;

    public AuthController(AuthApplicationService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequestDto dto) {
        return ResponseEntity.ok(authService.register(dto));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequestDto dto) {
        return ResponseEntity.ok(authService.login(dto));
    }

    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequestDto dto) {
        return ResponseEntity.ok(authService.loginWithGoogle(dto));
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<Map<String, Object>> verify2Fa(
            @Valid @RequestBody Verify2FaRequestDto dto,
            HttpServletResponse response
    ) {
        AuthSessionResponseDto sessionUser = authService.verify2Fa(dto, response);
        return ResponseEntity.ok(Map.of(
                "status", "AUTHENTICATED",
                "user", sessionUser
        ));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        return authService.getCurrentSession(request)
                .map(session -> ResponseEntity.ok(Map.<String, Object>of(
                        "id", session.userId(),
                        "name", session.name(),
                        "email", session.email(),
                        "isCreator", session.isCreator(),
                        "creatorId", session.creatorId() != null ? session.creatorId() : "",
                        "creatorHandle", session.creatorHandle() != null ? session.creatorHandle() : "",
                        "isModerator", session.isModerator()
                )))
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.ok(Map.of("message", "Sessão encerrada com sucesso"));
    }
}
