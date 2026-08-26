package com.palisade.travel.domain.mission.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum MissionErrorCode implements ErrorCode {
    MISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "MISSION_NOT_FOUND", "Mission was not found."),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "Trip was not found."),
    TRIP_ACCESS_FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "TRIP_ACCESS_FORBIDDEN",
            "The trip does not belong to the current teacher."
    ),
    NOT_A_TRIP_PARTICIPANT(
            HttpStatus.FORBIDDEN,
            "NOT_A_TRIP_PARTICIPANT",
            "The student is not a participant of this trip."
    ),
    MISSION_NOT_ACCESSIBLE(
            HttpStatus.FORBIDDEN,
            "MISSION_NOT_ACCESSIBLE",
            "Mission is not accessible at this time."
    ),
    INVALID_MISSION_PERIOD(
            HttpStatus.BAD_REQUEST,
            "INVALID_MISSION_PERIOD",
            "Mission end time must be after the start time."
    ),
    INVALID_CHECK_IN(
            HttpStatus.BAD_REQUEST,
            "INVALID_CHECK_IN",
            "Check-in PIN is invalid or the mission is no longer available."
    ),
    INVALID_PHOTO_SUBMISSION(
            HttpStatus.BAD_REQUEST,
            "INVALID_PHOTO_SUBMISSION",
            "Photo submission is invalid or the mission is no longer available."
    ),
    RESUBMISSION_NOT_ALLOWED(
            HttpStatus.BAD_REQUEST,
            "RESUBMISSION_NOT_ALLOWED",
            "Only a rejected submission can be resubmitted."
    ),
    SUBMISSION_NOT_FOUND(HttpStatus.NOT_FOUND, "SUBMISSION_NOT_FOUND", "Mission submission was not found."),
    MISSION_TYPE_MISMATCH(
            HttpStatus.BAD_REQUEST,
            "MISSION_TYPE_MISMATCH",
            "This action is not supported for the mission's type."
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
