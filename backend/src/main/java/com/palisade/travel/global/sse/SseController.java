package com.palisade.travel.global.sse;

import com.palisade.travel.global.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/teacher/sse")
@RequiredArgsConstructor
public class SseController {

    private final SseConnectionService sseConnectionService;

    @GetMapping(value = "/connect", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter connect(@AuthenticationPrincipal UserPrincipal user) {
        return sseConnectionService.connect(user.userId());
    }
}
