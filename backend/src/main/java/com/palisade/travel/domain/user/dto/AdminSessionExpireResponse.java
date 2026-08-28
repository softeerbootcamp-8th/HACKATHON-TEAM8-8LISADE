package com.palisade.travel.domain.user.dto;

public record AdminSessionExpireResponse(Long userId, int expiredSessionCount, long revokedDeviceCount) {
}
