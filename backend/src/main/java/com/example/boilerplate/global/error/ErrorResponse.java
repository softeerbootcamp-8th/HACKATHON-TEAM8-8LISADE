package com.example.boilerplate.global.error;

import java.util.List;

public record ErrorResponse(boolean success, String code, String message, List<ValidationError> details) {

    public static ErrorResponse of(ErrorCode errorCode) {
        return new ErrorResponse(false, errorCode.code(), errorCode.message(), null);
    }

    public static ErrorResponse of(ErrorCode errorCode, List<ValidationError> details) {
        return new ErrorResponse(false, errorCode.code(), errorCode.message(), details);
    }
}
