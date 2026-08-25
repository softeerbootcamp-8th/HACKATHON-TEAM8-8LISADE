package com.palisade.travel.global.security;

import com.palisade.travel.global.error.CommonErrorCode;
import com.palisade.travel.global.error.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authenticationException) throws IOException {
        write(response, CommonErrorCode.UNAUTHORIZED);
    }

    private void write(HttpServletResponse response, CommonErrorCode errorCode) throws IOException {
        response.setStatus(errorCode.status().value());
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(), ErrorResponse.of(errorCode));
    }
}
