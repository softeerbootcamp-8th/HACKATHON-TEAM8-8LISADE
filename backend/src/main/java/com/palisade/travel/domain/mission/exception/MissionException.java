package com.palisade.travel.domain.mission.exception;

import com.palisade.travel.global.error.ApiException;

public class MissionException extends ApiException {

    public MissionException(MissionErrorCode errorCode) {
        super(errorCode);
    }
}
