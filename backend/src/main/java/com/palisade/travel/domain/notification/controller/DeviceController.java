package com.palisade.travel.domain.notification.controller;

import com.palisade.travel.domain.notification.dto.DeviceDeleteRequest;
import com.palisade.travel.domain.notification.dto.DeviceRegisterRequest;
import com.palisade.travel.domain.notification.service.DeviceService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/notifications/devices")
@RequiredArgsConstructor
public class DeviceController {

    private final DeviceService deviceService;

    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void register(@AuthenticationPrincipal UserPrincipal user,
                          @Valid @RequestBody DeviceRegisterRequest request,
                          HttpSession session) {
        deviceService.register(user.userId(), request.token(), request.platform(), session.getId());
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unregister(@AuthenticationPrincipal UserPrincipal user,
                            @Valid @RequestBody DeviceDeleteRequest request) {
        deviceService.unregister(user.userId(), request.token());
    }
}
