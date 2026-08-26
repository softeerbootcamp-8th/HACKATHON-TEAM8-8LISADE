package com.palisade.travel.domain.notification.controller;

import com.palisade.travel.domain.notification.dto.NotificationResponse;
import com.palisade.travel.domain.notification.service.NotificationQueryService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/student/notifications")
@RequiredArgsConstructor
public class StudentNotificationController {

    private final NotificationQueryService notificationQueryService;

    @GetMapping
    public ApiResponse<List<NotificationResponse>> list(Authentication authentication) {
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
        return ApiResponse.success(notificationQueryService.list(user.userId()));
    }
}
