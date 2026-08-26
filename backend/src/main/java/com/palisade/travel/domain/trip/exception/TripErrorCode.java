package com.palisade.travel.domain.trip.exception;

import com.palisade.travel.global.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@RequiredArgsConstructor
public enum TripErrorCode implements ErrorCode {
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "Trip not found."),
    TRIP_ACCESS_DENIED(HttpStatus.FORBIDDEN, "TRIP_ACCESS_DENIED", "Trip access denied."),
    INVALID_INVITE_CODE(HttpStatus.BAD_REQUEST, "INVALID_INVITE_CODE", "Invalid invite code."),
    ACTIVE_TRIP_ALREADY_JOINED(HttpStatus.CONFLICT, "ACTIVE_TRIP_ALREADY_JOINED", "Student already joined an active trip."),
    TRIP_NOT_ACTIVE(HttpStatus.CONFLICT, "TRIP_NOT_ACTIVE", "Trip is not active.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    @Override public HttpStatus status() { return status; }
    @Override public String code() { return code; }
    @Override public String message() { return message; }
}
