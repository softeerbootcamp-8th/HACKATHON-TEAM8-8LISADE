package com.palisade.travel.global.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErrorResponse> handleApiException(ApiException exception) {
        ErrorCode errorCode = exception.getErrorCode();
        log.warn("ApiException: code={}, message={}", errorCode.code(), errorCode.message());
        return ResponseEntity.status(errorCode.status()).body(ErrorResponse.of(errorCode));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        List<ValidationError> details = exception.getBindingResult().getFieldErrors().stream()
                .map(this::toValidationError)
                .toList();
        log.warn("Validation failed: {}", details);
        return ResponseEntity.badRequest().body(ErrorResponse.of(CommonErrorCode.VALIDATION_ERROR, details));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedRequest(HttpMessageNotReadableException exception) {
        log.warn("Malformed request body: {}", exception.getMessage());
        return ResponseEntity.badRequest().body(ErrorResponse.of(CommonErrorCode.INVALID_REQUEST));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpectedException(HttpServletRequest request, Exception exception) {
        log.error("Unexpected exception on {} {}", request.getMethod(), request.getRequestURI(), exception);
        return ResponseEntity.internalServerError().body(ErrorResponse.of(CommonErrorCode.INTERNAL_SERVER_ERROR));
    }

    private ValidationError toValidationError(FieldError error) {
        return new ValidationError(error.getField(), error.getDefaultMessage());
    }
}
