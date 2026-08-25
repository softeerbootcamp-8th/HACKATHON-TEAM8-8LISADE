package com.palisade.travel.domain.trip.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record CreateTripRequest(
        @NotBlank @Size(max = 100) String title,
        @NotBlank @Size(max = 200) String place,
        String description,
        @NotNull LocalDateTime startAt,
        @NotNull LocalDateTime endAt,
        @NotNull @Size(min = 3, max = 1000) List<@Valid GeofencePointRequest> geofencePoints
) {
    public record GeofencePointRequest(
            @NotNull @DecimalMin("-90.0") @DecimalMax("90.0") @Digits(integer = 2, fraction = 7)
            BigDecimal latitude,
            @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") @Digits(integer = 3, fraction = 7)
            BigDecimal longitude
    ) {
    }
}
