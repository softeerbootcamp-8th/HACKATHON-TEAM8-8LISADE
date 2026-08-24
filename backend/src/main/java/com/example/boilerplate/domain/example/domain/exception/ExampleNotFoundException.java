package com.example.boilerplate.domain.example.domain.exception;

import com.example.boilerplate.global.error.ApiException;

public class ExampleNotFoundException extends ApiException {

    public ExampleNotFoundException() {
        super(ExampleErrorCode.EXAMPLE_NOT_FOUND);
    }
}
