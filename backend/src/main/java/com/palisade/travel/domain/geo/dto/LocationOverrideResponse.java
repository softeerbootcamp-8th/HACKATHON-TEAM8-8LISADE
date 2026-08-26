package com.palisade.travel.domain.geo.dto;

import java.math.BigDecimal;

public record LocationOverrideResponse(
        boolean enabled,
        BigDecimal latitude,
        BigDecimal longitude,
        DefaultCenter defaultCenter
) {

    /** 학생이 시연용 위치를 아직 하나도 고르지 않았을 때 지도를 처음 띄울 기준점 — 마지막으로 보고된 위치. */
    public record DefaultCenter(BigDecimal latitude, BigDecimal longitude) {
    }
}
