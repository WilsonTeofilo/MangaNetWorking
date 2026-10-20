package com.manganetworking.controller;

import com.manganetworking.service.auth.AuthApplicationService;
import com.manganetworking.service.auth.PasswordResetApplicationService;
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
    private final PasswordResetApplicationService passwordResetService;

    public AuthController(AuthApplicationService authService,
                          PasswordResetApplicationService passwordResetService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequestDto dto, HttpServletRequest request) {
        return ResponseEntity.ok(authService.register(dto, request));
    }

    @GetMapping("/policy")
    public ResponseEntity<Map<String, String>> currentPolicy() {
        return ResponseEntity.ok(Map.of("version", authService.currentPolicyVersion()));
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequestDto dto, HttpServletRequest request) {
        return ResponseEntity.ok(authService.login(dto, request));
    }

    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> loginWithGoogle(@Valid @RequestBody GoogleLoginRequestDto dto, HttpServletRequest request) {
        return ResponseEntity.ok(authService.loginWithGoogle(dto, request));
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<Map<String, Object>> verify2Fa(
            @Valid @RequestBody Verify2FaRequestDto dto,
            HttpServletResponse response
    ) {
        return ResponseEntity.ok(Map.of("status", "AUTHENTICATED", "user", authService.verify2Fa(dto, response)));
    }

    @PostMapping("/2fa/request")
    public ResponseEntity<Map<String, Object>> requestStepUpOtp(HttpServletRequest request) {
        authService.requestStepUpOtp(request);
        return ResponseEntity.ok(Map.of("status", "OTP_SENT", "message", "Código de verificação de segurança enviado ao seu e-mail."));
    }

    @PostMapping("/password-reset/request")
    public ResponseEntity<Map<String, String>> requestPasswordReset(
            @Valid @RequestBody PasswordResetRequestDto dto,
            HttpServletRequest request
    ) {
        return ResponseEntity.ok(passwordResetService.request(dto, request));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(@Valid @RequestBody PasswordResetConfirmDto dto) {
        passwordResetService.confirm(dto);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentSessionResponseDto> me(HttpServletRequest request) {
        return authService.currentSession(request)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request, HttpServletResponse response) {
        authService.logout(request, response);
        return ResponseEntity.ok(Map.of("message", "Sessão encerrada com sucesso"));
    }
}
