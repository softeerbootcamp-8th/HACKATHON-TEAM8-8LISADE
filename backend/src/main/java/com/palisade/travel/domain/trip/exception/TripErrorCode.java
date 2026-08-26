package com.palisade.travel.domain.trip.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum TripErrorCode implements ErrorCode {
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "체험학습을 찾을 수 없습니다."),
    TRIP_ACCESS_DENIED(HttpStatus.FORBIDDEN, "TRIP_ACCESS_DENIED", "체험학습에 접근할 권한이 없습니다."),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "INVALID_INVITE_CODE", "초대 코드가 올바르지 않습니다."),
    ACTIVE_TRIP_ALREADY_JOINED(HttpStatus.CONFLICT, "ACTIVE_TRIP_ALREADY_JOINED", "이미 참여 중인 체험학습이 있습니다."),
    TRIP_NOT_ACTIVE(HttpStatus.CONFLICT, "TRIP_NOT_ACTIVE", "진행 중인 체험학습이 아닙니다."),
    TRIP_NOT_READY(HttpStatus.CONFLICT, "TRIP_NOT_READY", "준비 상태의 체험학습이 아닙니다."),
    INVITE_CODE_GENERATION_FAILED(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "INVITE_CODE_GENERATION_FAILED",
            "초대 코드 생성에 실패했습니다. 다시 시도해주세요."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus status() { return status; }
    @Override public String code() { return code; }
    @Override public String message() { return message; }
}
