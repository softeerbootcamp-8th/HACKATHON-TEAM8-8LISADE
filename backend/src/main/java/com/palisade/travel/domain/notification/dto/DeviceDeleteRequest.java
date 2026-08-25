package com.palisade.travel.domain.notification.dto;

import jakarta.validation.constraints.NotBlank;

public record DeviceDeleteRequest(
        @NotBlank String token
) {
}
