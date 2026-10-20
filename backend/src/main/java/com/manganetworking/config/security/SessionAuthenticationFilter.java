package com.manganetworking.config.security;

import com.manganetworking.service.session.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Component
public class SessionAuthenticationFilter extends OncePerRequestFilter {

    private final SessionService sessionService;

    public SessionAuthenticationFilter(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        String sessionId = extractSessionIdFromCookies(request);

        if (sessionId != null) {
            Optional<SessionService.UserSession> optionalSession = sessionService.validateSession(sessionId);

            if (optionalSession.isPresent()) {
                SessionService.UserSession session = optionalSession.get();

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
                if (session.isCreator()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_CREATOR"));
                }
                if (session.isModerator()) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_MODERATOR"));
                }
                if (session.isOwner()) {
                    // O proprietário herda as capacidades operacionais de moderação, mas
                    // mantém ROLE_OWNER para rotas administrativas exclusivas.
                    authorities.add(new SimpleGrantedAuthority("ROLE_OWNER"));
                    if (!session.isModerator()) {
                        authorities.add(new SimpleGrantedAuthority("ROLE_MODERATOR"));
                    }
                }

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        session,
                        null,
                        authorities
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractSessionIdFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        return Arrays.stream(cookies)
                .filter(c -> SessionService.SESSION_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
