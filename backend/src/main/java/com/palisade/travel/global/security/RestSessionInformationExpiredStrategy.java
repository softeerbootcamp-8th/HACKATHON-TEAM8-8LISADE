package com.palisade.travel.global.security;

import com.palisade.travel.global.error.CommonErrorCode;
import com.palisade.travel.global.error.ErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.web.session.SessionInformationExpiredEvent;
import org.springframework.security.web.session.SessionInformationExpiredStrategy;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

/**
 * 관리자가 세션을 강제 만료시켰거나 동시 세션 정책에 의해 세션이 만료된 경우,
 * 기본 리다이렉트 대신 다른 REST API 응답과 동일한 형식의 401 JSON을 내려준다.
 */
@Component
@RequiredArgsConstructor
public class RestSessionInformationExpiredStrategy implements SessionInformationExpiredStrategy {

    private final ObjectMapper objectMapper;

    @Override
    public void onExpiredSessionDetected(SessionInformationExpiredEvent event) throws IOException {
        HttpServletResponse response = event.getResponse();
        response.setStatus(CommonErrorCode.UNAUTHORIZED.status().value());
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(), ErrorResponse.of(CommonErrorCode.UNAUTHORIZED));
    }
}
