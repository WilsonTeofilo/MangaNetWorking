package com.manganetworking.config.security;

import com.manganetworking.domain.relational.UserEntity;
import com.manganetworking.service.session.SessionService;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SessionAuthenticationFilterTest {

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void shouldGrantModeratorAuthorityOnlyWhenSessionHasModeratorRole() throws ServletException, IOException {
        SessionService sessionService = new SessionService();
        SessionAuthenticationFilter filter = new SessionAuthenticationFilter(sessionService);
        UserEntity moderator = new UserEntity();
        moderator.setId(UUID.randomUUID());
        moderator.setEmail("moderator@example.test");
        moderator.setName("Moderator");
        moderator.setModerator(true);

        MockHttpServletResponse loginResponse = new MockHttpServletResponse();
        sessionService.createSession(moderator, null, loginResponse);

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(loginResponse.getCookie(SessionService.SESSION_COOKIE_NAME));
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        assertTrue(authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_MODERATOR")));
    }
}
