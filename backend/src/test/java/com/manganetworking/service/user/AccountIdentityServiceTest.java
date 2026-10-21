package com.manganetworking.service.user;

import com.manganetworking.domain.relational.CreatorEntity;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.repository.jpa.CreatorRepository;
import com.manganetworking.repository.jpa.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Username: identificador público e segunda via de login.
 *
 * <p>Regra: pode ser reivindicado <strong>uma vez</strong> (enquanto a conta usa o
 * identificador gerado automaticamente) e depois é imutável. Quando o usuário é escritor,
 * o handle público acompanha o username, desde que o handle esteja livre.</p>
 */
@ExtendWith(MockitoExtension.class)
class AccountIdentityServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CreatorRepository creatorRepository;

    @InjectMocks
    private AccountIdentityService identityService;

    private UserEntity user;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = new UserEntity();
        user.setId(userId);
        user.setEmail("wilson@teste.com");
        user.setName("Wilson");
    }

    @Test
    @DisplayName("Conta com username gerado pode reivindicar um username próprio")
    void shouldClaimUsernameWhenStillGenerated() {
        user.setUsername(identityService.generatedUsernameFor(userId));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("wilson.teofilo")).thenReturn(false);

        identityService.claimUsername(userId, "  Wilson.Teofilo ");

        assertEquals("wilson.teofilo", user.getUsername());
    }

    @Test
    @DisplayName("Username já escolhido é imutável")
    void shouldRejectChangingChosenUsername() {
        user.setUsername("wilson.teofilo");
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> identityService.claimUsername(userId, "outro"));

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Username em uso é recusado")
    void shouldRejectTakenUsername() {
        user.setUsername(identityService.generatedUsernameFor(userId));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("wilson")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> identityService.claimUsername(userId, "wilson"));
    }

    @Test
    @DisplayName("Username inválido é recusado pela política")
    void shouldRejectInvalidUsername() {
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        assertThrows(IllegalArgumentException.class, () -> identityService.claimUsername(userId, "wil son"));
    }

    @Test
    @DisplayName("Handle do escritor acompanha o username reivindicado")
    void shouldSyncCreatorHandleWithUsername() {
        user.setUsername(identityService.generatedUsernameFor(userId));
        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle("handle-antigo");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("teofilo")).thenReturn(false);
        when(creatorRepository.findByUserId(userId)).thenReturn(Optional.of(creator));
        when(creatorRepository.findByHandle("teofilo")).thenReturn(Optional.empty());

        identityService.claimUsername(userId, "teofilo");

        assertEquals("teofilo", creator.getHandle());
    }

    @Test
    @DisplayName("Handle ocupado não impede a reivindicação do username")
    void shouldKeepExistingHandleWhenTaken() {
        user.setUsername(identityService.generatedUsernameFor(userId));
        CreatorEntity creator = new CreatorEntity();
        creator.setId(UUID.randomUUID());
        creator.setHandle("outro-autor");

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userRepository.existsByUsernameIgnoreCase("teofilo")).thenReturn(false);
        when(creatorRepository.findByUserId(userId)).thenReturn(Optional.of(creator));
        when(creatorRepository.findByHandle("teofilo")).thenReturn(Optional.of(creator));

        identityService.claimUsername(userId, "teofilo");

        assertEquals("teofilo", user.getUsername());
        assertEquals("outro-autor", creator.getHandle());
        assertTrue(identityService.isGeneratedUsername(user) == false);
    }
}
