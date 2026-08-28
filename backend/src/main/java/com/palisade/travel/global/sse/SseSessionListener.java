package com.palisade.travel.global.sse;

import com.palisade.travel.domain.notification.service.DeviceService;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SseSessionListener implements HttpSessionListener {

    private final SseConnectionService sseConnectionService;
    private final DeviceService deviceService;

    @Override
    public void sessionDestroyed(HttpSessionEvent event) {
        Object attribute = event.getSession()
                .getAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
        if (attribute instanceof SecurityContext context
                && context.getAuthentication() != null
                && context.getAuthentication().getPrincipal() instanceof UserPrincipal user) {
            sseConnectionService.disconnect(user.userId());
        }
        deviceService.deleteBySessionId(event.getSession().getId());
    }
}
