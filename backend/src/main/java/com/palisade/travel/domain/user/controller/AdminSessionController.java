package com.palisade.travel.domain.user.controller;

import com.palisade.travel.domain.user.dto.AdminSessionExpireResponse;
import com.palisade.travel.domain.user.service.AdminSessionService;
import com.palisade.travel.global.api.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminSessionController {

    private final AdminSessionService adminSessionService;

    @PostMapping("/{userId}/sessions/expire")
    public ApiResponse<AdminSessionExpireResponse> expireSessions(@PathVariable Long userId) {
        return ApiResponse.success(adminSessionService.expireAllSessions(userId));
    }
}
