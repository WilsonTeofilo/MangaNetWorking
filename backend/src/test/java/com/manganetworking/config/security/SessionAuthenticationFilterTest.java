package com.manganetworking.config.security;

import com.manganetworking.config.properties.PlatformProperties;
import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.service.session.SessionService;
import com.manganetworking.service.session.SessionStore;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SessionAuthenticationFilterTest {

    @Mock
    private SessionStore sessionStore;

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldGrantModeratorAuthorityOnlyWhenSessionHasModeratorRole() throws ServletException, IOException {
        // Setup mocks
        SessionService sessionService = new SessionService(sessionStore);
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(sessionService);
        
        UserEntity moderator = new UserEntity();
        moderator.setId(UUID.randomUUID());
        moderator.setEmail("moderator@example.test");
        moderator.setName("Moderator");
        moderator.setModerator(true);
        
        // Create a mock session
        String sessionId = "test_session_id";
        SessionService.UserSession moderatorSession = new SessionService.UserSession(
                sessionId,
                moderator.getId(),
                moderator.getEmail(),
                moderator.getName(),
                false,
                true, // isModerator
                null,
                null,
                Instant.now().plusSeconds(3600)
        );
        
        // Setup mock to return the session
        when(sessionStore.findById(sessionId)).thenReturn(Optional.of(moderatorSession));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new jakarta.servlet.http.Cookie(SessionService.SESSION_COOKIE_NAME, sessionId));
        
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_MODERATOR")));
    }
}
