package com.palisade.travel.domain.example.exception;

import com.palisade.travel.global.error.ErrorCode;
import org.springframework.http.HttpStatus;

public enum ExampleErrorCode implements ErrorCode {
    EXAMPLE_NOT_FOUND(HttpStatus.NOT_FOUND, "EXAMPLE_NOT_FOUND", "Example was not found.");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ExampleErrorCode(HttpStatus status, String code, String message) {
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
