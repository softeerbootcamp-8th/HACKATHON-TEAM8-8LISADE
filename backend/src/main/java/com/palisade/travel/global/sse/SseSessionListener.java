package com.palisade.travel.global.sse;

import com.palisade.travel.domain.notification.controller.DeviceController;
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
            // 세션에 저장된 fcmToken이 있을 때만, 이 세션에 연결된 device 한 건만 삭제한다.
            // 같은 유저의 다른 세션/기기(sessionId가 다름)의 토큰은 세션 attribute가 분리되어 있으므로 영향받지 않는다.
            Object fcmToken = event.getSession().getAttribute(DeviceController.FCM_TOKEN_ATTRIBUTE);
            if (fcmToken instanceof String token) {
                deviceService.unregister(user.userId(), token);
            }
        }
    }
}
