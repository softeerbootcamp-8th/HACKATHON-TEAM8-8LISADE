package com.palisade.travel.domain.notification.dto;

import com.palisade.travel.domain.notification.entity.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record DeviceRegisterRequest(
        @NotBlank String token,
        @NotNull DevicePlatform platform
) {
}
