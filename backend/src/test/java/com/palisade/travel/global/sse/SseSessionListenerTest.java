package com.palisade.travel.global.sse;

import com.palisade.travel.global.security.UserPrincipal;
import com.palisade.travel.domain.user.entity.UserRole;
import jakarta.servlet.http.HttpSessionEvent;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class SseSessionListenerTest {

    private final SseConnectionService sseConnectionService = mock(SseConnectionService.class);
    private final SseSessionListener listener = new SseSessionListener(sseConnectionService);

    @Test
    void sessionDestroyedDisconnectsTheAuthenticatedUsersEmitters() {
        UserPrincipal user = new UserPrincipal(1L, "teacher1", UserRole.TEACHER, "hash", true);
        SecurityContext context = new SecurityContextImpl(
                UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities()));
        MockHttpSession session = new MockHttpSession();
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        listener.sessionDestroyed(new HttpSessionEvent(session));

        verify(sseConnectionService).disconnect(1L);
    }

    @Test
    void sessionDestroyedDoesNothingWhenTheSessionHasNoSecurityContext() {
        MockHttpSession session = new MockHttpSession();

        listener.sessionDestroyed(new HttpSessionEvent(session));

        verify(sseConnectionService, never()).disconnect(org.mockito.ArgumentMatchers.anyLong());
    }
}
