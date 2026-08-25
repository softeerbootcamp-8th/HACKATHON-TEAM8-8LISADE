package com.palisade.travel.domain.user.service;

import com.palisade.travel.domain.user.dto.SignUpRequest;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.domain.user.exception.UserErrorCode;
import com.palisade.travel.domain.user.repository.UserRepository;
import com.palisade.travel.global.error.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserSignUpService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserSignUpService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void signUp(SignUpRequest request) {
        validateRoleProfile(request);
        if (userRepository.existsByLoginId(request.loginId())) {
            throw new ApiException(UserErrorCode.DUPLICATE_LOGIN_ID);
        }

        userRepository.save(User.create(
                request.loginId(),
                passwordEncoder.encode(request.password()),
                request.name(),
                request.role(),
                request.phoneNumber(),
                request.parentNumber(),
                Boolean.TRUE.equals(request.guardianConsent())
        ));
    }

    private void validateRoleProfile(SignUpRequest request) {
        if (!hasText(request.phoneNumber())) {
            throw new ApiException(UserErrorCode.ROLE_PROFILE_REQUIRED);
        }
        if (request.role() == UserRole.STUDENT) {
            if (!hasText(request.parentNumber())) {
                throw new ApiException(UserErrorCode.ROLE_PROFILE_REQUIRED);
            }
            if (!Boolean.TRUE.equals(request.guardianConsent())) {
                throw new ApiException(UserErrorCode.GUARDIAN_CONSENT_REQUIRED);
            }
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
