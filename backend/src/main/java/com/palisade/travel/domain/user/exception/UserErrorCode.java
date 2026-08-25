package com.palisade.travel.domain.user.exception;

import com.palisade.travel.global.error.ErrorCode;
import org.springframework.http.HttpStatus;

public enum UserErrorCode implements ErrorCode {
    DUPLICATE_LOGIN_ID(HttpStatus.BAD_REQUEST, "DUPLICATE_LOGIN_ID", "Login ID is already in use."),
    ROLE_PROFILE_REQUIRED(HttpStatus.BAD_REQUEST, "ROLE_PROFILE_REQUIRED", "Required profile information is missing."),
    GUARDIAN_CONSENT_REQUIRED(HttpStatus.BAD_REQUEST, "GUARDIAN_CONSENT_REQUIRED", "Guardian consent is required."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Password must be 8 to 20 characters without spaces."),
    INVALID_PHONE_NUMBER(HttpStatus.BAD_REQUEST, "INVALID_PHONE_NUMBER", "Phone number must be a valid Korean mobile number.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    UserErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }

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
