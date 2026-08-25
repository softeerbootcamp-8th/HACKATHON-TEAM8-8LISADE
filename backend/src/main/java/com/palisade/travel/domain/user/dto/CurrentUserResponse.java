package com.palisade.travel.domain.user.dto;

import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.global.security.UserPrincipal;

public record CurrentUserResponse(Long id, String loginId, String name, UserRole role) {

    public static CurrentUserResponse from(UserPrincipal user) {
        return new CurrentUserResponse(user.userId(), user.loginId(), user.name(), user.role());
    }
}
