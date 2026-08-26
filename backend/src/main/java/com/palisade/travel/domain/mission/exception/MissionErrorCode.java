package com.palisade.travel.domain.mission.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum MissionErrorCode implements ErrorCode {
    MISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "MISSION_NOT_FOUND", "미션을 찾을 수 없습니다."),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "체험학습을 찾을 수 없습니다."),
    TRIP_ACCESS_FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "TRIP_ACCESS_FORBIDDEN",
            "담당 교사만 접근할 수 있는 체험학습입니다."
    ),
    NOT_A_TRIP_PARTICIPANT(
            HttpStatus.FORBIDDEN,
            "NOT_A_TRIP_PARTICIPANT",
            "해당 체험학습에 참여 중인 학생이 아닙니다."
    ),
    MISSION_NOT_ACCESSIBLE(
            HttpStatus.FORBIDDEN,
            "MISSION_NOT_ACCESSIBLE",
            "지금은 접근할 수 없는 미션입니다."
    ),
    INVALID_MISSION_PERIOD(
            HttpStatus.BAD_REQUEST,
            "INVALID_MISSION_PERIOD",
            "미션 종료 시각은 시작 시각보다 이후여야 합니다."
    ),
    INVALID_CHECK_IN(
            HttpStatus.BAD_REQUEST,
            "INVALID_CHECK_IN",
            "출석 코드가 올바르지 않거나 더 이상 참여할 수 없는 미션입니다."
    ),
    INVALID_PHOTO_SUBMISSION(
            HttpStatus.BAD_REQUEST,
            "INVALID_PHOTO_SUBMISSION",
            "사진 제출이 올바르지 않거나 더 이상 참여할 수 없는 미션입니다."
    ),
    RESUBMISSION_NOT_ALLOWED(
            HttpStatus.BAD_REQUEST,
            "RESUBMISSION_NOT_ALLOWED",
            "반려된 제출물만 다시 제출할 수 있습니다."
    ),
    SUBMISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "SUBMISSION_NOT_FOUND", "미션 제출 내역을 찾을 수 없습니다."),
    MISSION_TYPE_MISMATCH(
            HttpStatus.BAD_REQUEST,
            "MISSION_TYPE_MISMATCH",
            "이 미션 유형에서는 지원하지 않는 기능입니다."
    ),
    MISSION_ALREADY_COMPLETED(
            HttpStatus.BAD_REQUEST,
            "MISSION_ALREADY_COMPLETED",
            "이미 완료 처리된 미션입니다."
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
