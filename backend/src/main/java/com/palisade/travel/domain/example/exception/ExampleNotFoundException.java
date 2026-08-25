package com.palisade.travel.domain.example.exception;

import com.palisade.travel.global.error.ApiException;

public class ExampleNotFoundException extends ApiException {

    public ExampleNotFoundException() {
        super(ExampleErrorCode.EXAMPLE_NOT_FOUND);
    }
}
