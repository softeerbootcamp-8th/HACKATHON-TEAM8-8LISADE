package com.palisade.travel.global.security;

import com.palisade.travel.global.error.CommonErrorCode;
import com.palisade.travel.global.error.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(CommonErrorCode.FORBIDDEN.status().value());
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(), ErrorResponse.of(CommonErrorCode.FORBIDDEN));
    }
}
