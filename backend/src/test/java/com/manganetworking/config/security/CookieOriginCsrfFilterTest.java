package com.manganetworking.config.security;

import com.manganetworking.service.session.SessionService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CookieOriginCsrfFilterTest {

    private static final String APP_ORIGIN = "https://manganetworking.example";

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    private CookieOriginCsrfFilter filter;

    @BeforeEach
    void setUp() {
        filter = new CookieOriginCsrfFilter(Set.of(APP_ORIGIN));
        lenient().when(request.getCookies())
                .thenReturn(new Cookie[]{new Cookie(SessionService.SESSION_COOKIE_NAME, "session")});
    }

    @Test
    void allowsUnsafeBrowserRequestFromTrustedOrigin() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getHeader("Origin")).thenReturn(APP_ORIGIN);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void rejectsUnsafeBrowserRequestFromUntrustedOrigin() throws Exception {
        when(request.getMethod()).thenReturn("DELETE");
        when(request.getHeader("Origin")).thenReturn("https://attacker.example");
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(filterChain, never()).doFilter(request, response);
        assertTrue(body.toString().contains("Origem não autorizada"));
    }

    @Test
    void allowsSafeMethodWithSessionCookie() throws Exception {
        when(request.getMethod()).thenReturn("GET");

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void allowsWebhookLikeRequestWithoutSessionCookie() throws Exception {
        when(request.getMethod()).thenReturn("POST");
        when(request.getCookies()).thenReturn(null);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
    }

    @Test
    void rejectsBrowserRequestMissingOrigin() throws Exception {
        when(request.getMethod()).thenReturn("PUT");
        when(request.getHeader(anyString())).thenAnswer(invocation ->
                "Sec-Fetch-Site".equals(invocation.getArgument(0)) ? "same-site" : null);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        filter.doFilterInternal(request, response, filterChain);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(filterChain, never()).doFilter(request, response);
    }
}
