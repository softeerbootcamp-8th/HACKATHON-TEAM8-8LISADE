package com.palisade.travel.domain.geo.dto;

import java.math.BigDecimal;

public record LocationOverrideResponse(
        boolean enabled,
        BigDecimal latitude,
        BigDecimal longitude
) {
}
