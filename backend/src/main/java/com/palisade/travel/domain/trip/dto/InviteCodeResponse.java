package com.palisade.travel.domain.trip.dto;

import com.palisade.travel.domain.trip.entity.InviteCode;

public record InviteCodeResponse(String code) {
    public static InviteCodeResponse from(InviteCode inviteCode) {
        return new InviteCodeResponse(inviteCode.getCode());
    }
}
