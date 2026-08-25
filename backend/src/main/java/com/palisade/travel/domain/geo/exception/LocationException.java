package com.palisade.travel.domain.geo.exception;

import com.palisade.travel.global.error.ApiException;

public class LocationException extends ApiException {

    public LocationException(LocationErrorCode errorCode) {
        super(errorCode);
    }
}
