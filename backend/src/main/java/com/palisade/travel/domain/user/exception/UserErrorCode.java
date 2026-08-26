package com.palisade.travel.domain.user.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {
    DUPLICATE_LOGIN_ID(HttpStatus.BAD_REQUEST, "DUPLICATE_LOGIN_ID", "Login ID is already in use."),
    ROLE_PROFILE_REQUIRED(HttpStatus.BAD_REQUEST, "ROLE_PROFILE_REQUIRED", "Required profile information is missing."),
    GUARDIAN_CONSENT_REQUIRED(HttpStatus.BAD_REQUEST, "GUARDIAN_CONSENT_REQUIRED", "Guardian consent is required."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Password must be 8 to 20 characters without spaces."),
    INVALID_PHONE_NUMBER(HttpStatus.BAD_REQUEST, "INVALID_PHONE_NUMBER", "Phone number must be a valid Korean mobile number."),
    INVALID_CREDENTIALS(
            HttpStatus.UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "아이디 또는 비밀번호가 일치하지 않습니다."
    ),
    ACCOUNT_DISABLED(
            HttpStatus.UNAUTHORIZED,
            "ACCOUNT_DISABLED",
            "비활성화된 계정입니다. 관리자에게 문의해주세요."
    );

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
