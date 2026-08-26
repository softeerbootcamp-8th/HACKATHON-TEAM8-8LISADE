package com.palisade.travel.domain.trip.exception;

import com.palisade.travel.global.error.ApiException;

public class TripException extends ApiException {

    public TripException(TripErrorCode errorCode) {
        super(errorCode);
    }
}
