package com.palisade.travel.domain.user.dto;

import com.palisade.travel.domain.user.entity.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SignUpRequest(
        @NotNull UserRole role,
        @NotBlank String name,
        @NotBlank String loginId,
        @NotBlank String password,
        String phoneNumber,
        String parentNumber,
        Boolean guardianConsent
) {
}
