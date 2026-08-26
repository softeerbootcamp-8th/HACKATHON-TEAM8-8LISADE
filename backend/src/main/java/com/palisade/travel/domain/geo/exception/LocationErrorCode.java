package com.palisade.travel.domain.geo.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum LocationErrorCode implements ErrorCode {
    PARTICIPATING_TRIP_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "PARTICIPATING_TRIP_NOT_FOUND",
            "참여 중인 체험학습을 찾을 수 없습니다."
    ),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "체험학습을 찾을 수 없습니다."),
    TRIP_ACCESS_FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "TRIP_ACCESS_FORBIDDEN",
            "담당 교사만 접근할 수 있는 체험학습입니다."
    ),
    TRIP_INACTIVE(HttpStatus.GONE, "TRIP_INACTIVE", "이미 종료된 체험학습입니다."),
    GEOFENCE_NOT_CONFIGURED(
            HttpStatus.UNPROCESSABLE_CONTENT,
            "GEOFENCE_NOT_CONFIGURED",
            "체험학습에 안전 구역이 설정되어 있지 않습니다."
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
