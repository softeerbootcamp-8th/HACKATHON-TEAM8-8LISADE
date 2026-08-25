package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.InviteCode;

import java.time.LocalDateTime;

public record InviteCodeResponse(String code, LocalDateTime expiresAt) {
    public static InviteCodeResponse from(InviteCode inviteCode) {
        return new InviteCodeResponse(inviteCode.getCode(), inviteCode.getExpiresAt());
    }
}
