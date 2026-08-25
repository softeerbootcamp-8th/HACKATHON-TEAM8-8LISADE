package com.palisade.travel.domain.geo.exception;

import com.palisade.travel.global.error.ErrorCode;
import org.springframework.http.HttpStatus;

public enum LocationErrorCode implements ErrorCode {
    PARTICIPATING_TRIP_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "PARTICIPATING_TRIP_NOT_FOUND",
            "Participating trip was not found."
    ),
    TRIP_NOT_FOUND(HttpStatus.NOT_FOUND, "TRIP_NOT_FOUND", "Trip was not found."),
    TRIP_INACTIVE(HttpStatus.GONE, "TRIP_INACTIVE", "Trip is no longer active.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    LocationErrorCode(HttpStatus status, String code, String message) {
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
