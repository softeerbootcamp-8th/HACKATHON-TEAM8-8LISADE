package com.palisade.travel.domain.user.exception;

import com.palisade.travel.global.error.ApiException;

public class UserException extends ApiException {

    public UserException(UserErrorCode errorCode) {
        super(errorCode);
    }
}
