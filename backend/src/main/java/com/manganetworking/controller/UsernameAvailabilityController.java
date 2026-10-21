package com.manganetworking.service.user;

import com.manganetworking.service.user.dto.UsernameAvailabilityResponseDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consulta de disponibilidade do username.
 *
 * <p>Existe para o titular nunca esbarrar num erro seco de "já está em uso": a tela verifica
 * enquanto ele digita e oferece uma alternativa livre. É informação pública por natureza (o
 * username é o identificador público do perfil) e fica sujeita ao rate limit global da API.</p>
 */
@RestController
@RequestMapping("/api/users")
public class UsernameAvailabilityController {

    private final AccountIdentityService identityService;

    public UsernameAvailabilityController(AccountIdentityService identityService) {
        this.identityService = identityService;
    }

    @GetMapping("/username-available")
    public UsernameAvailabilityResponseDto checkAvailability(@RequestParam String username) {
        AccountIdentityService.UsernameAvailability availability = identityService.checkAvailability(username);
        return new UsernameAvailabilityResponseDto(
                availability.available(),
                availability.suggestion(),
                availability.invalidReason());
    }
}
