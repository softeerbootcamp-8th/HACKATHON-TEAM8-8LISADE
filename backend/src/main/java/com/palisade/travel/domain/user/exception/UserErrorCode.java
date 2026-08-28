package com.palisade.travel.domain.user.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum UserErrorCode implements ErrorCode {
    DUPLICATE_LOGIN_ID(HttpStatus.BAD_REQUEST, "DUPLICATE_LOGIN_ID", "이미 사용 중인 아이디입니다."),
    ROLE_PROFILE_REQUIRED(HttpStatus.BAD_REQUEST, "ROLE_PROFILE_REQUIRED", "필수 프로필 정보가 누락되었습니다."),
    GUARDIAN_CONSENT_REQUIRED(HttpStatus.BAD_REQUEST, "GUARDIAN_CONSENT_REQUIRED", "보호자 동의가 필요합니다."),
    INVALID_PASSWORD(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "비밀번호는 공백 없이 8자 이상 20자 이하로 입력해주세요."),
    INVALID_PHONE_NUMBER(HttpStatus.BAD_REQUEST, "INVALID_PHONE_NUMBER", "휴대폰 번호 형식이 올바르지 않습니다."),
    INVALID_CREDENTIALS(
            HttpStatus.UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "아이디 또는 비밀번호가 일치하지 않습니다."
    ),
    ACCOUNT_DISABLED(
            HttpStatus.UNAUTHORIZED,
            "ACCOUNT_DISABLED",
            "비활성화된 계정입니다. 관리자에게 문의해주세요."
    ),
    ADMIN_ROLE_SIGNUP_NOT_ALLOWED(
            HttpStatus.FORBIDDEN,
            "ADMIN_ROLE_SIGNUP_NOT_ALLOWED",
            "관리자 계정은 회원가입으로 생성할 수 없습니다."
    ),
    USER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "USER_NOT_FOUND",
            "존재하지 않는 사용자입니다."
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
