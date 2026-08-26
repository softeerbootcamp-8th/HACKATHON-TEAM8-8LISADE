package com.palisade.travel.global.error;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum CommonErrorCode implements ErrorCode {
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "Invalid request."),
    VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Validation failed."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR", "An unexpected error occurred."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "Authentication is required."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "Access is denied.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override
    public HttpStatus status() {
        return status;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public String message() {
        return message;
    }
}
