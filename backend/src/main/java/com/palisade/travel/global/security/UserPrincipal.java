package com.palisade.travel.global.security;

import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.entity.UserRole;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

public record UserPrincipal(Long userId, String loginId, String name, UserRole role, String passwordHash, boolean enabled)
        implements UserDetails {

    public static UserPrincipal from(User user) {
        return new UserPrincipal(user.getId(), user.getLoginId(), user.getName(), user.getRole(), user.getPasswordHash(), user.isEnabled());
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return loginId;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
