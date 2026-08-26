package com.palisade.travel.domain.user.service;

import com.palisade.travel.domain.user.dto.SignUpRequest;
import com.palisade.travel.domain.user.entity.User;
import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.domain.user.exception.UserErrorCode;
import com.palisade.travel.domain.user.repository.UserRepository;
import com.palisade.travel.global.error.ApiException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserSignUpService {

    private static final java.util.regex.Pattern KOREAN_MOBILE_NUMBER = java.util.regex.Pattern.compile("^01[016789]\\d{7,8}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void signUp(SignUpRequest request) {
        validatePassword(request.password());
        String phoneNumber = normalizePhoneNumber(request.phoneNumber());
        String parentNumber = request.role() == UserRole.STUDENT ? normalizePhoneNumber(request.parentNumber()) : null;
        validateRoleProfile(request, phoneNumber, parentNumber);
        if (userRepository.existsByLoginId(request.loginId())) {
            throw new ApiException(UserErrorCode.DUPLICATE_LOGIN_ID);
        }

        userRepository.save(User.create(
                request.loginId(),
                passwordEncoder.encode(request.password()),
                request.name(),
                request.role(),
                phoneNumber,
                parentNumber,
                Boolean.TRUE.equals(request.guardianConsent())
        ));
    }

    private void validateRoleProfile(SignUpRequest request, String phoneNumber, String parentNumber) {
        if (phoneNumber == null) {
            throw new ApiException(UserErrorCode.ROLE_PROFILE_REQUIRED);
        }
        if (request.role() == UserRole.STUDENT) {
            if (parentNumber == null) {
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

    private void validatePassword(String password) {
        if (password.length() < 8 || password.length() > 20 || password.chars().anyMatch(Character::isWhitespace)) {
            throw new ApiException(UserErrorCode.INVALID_PASSWORD);
        }
    }

    private String normalizePhoneNumber(String phoneNumber) {
        if (!hasText(phoneNumber)) {
            return null;
        }
        String normalized = phoneNumber.replaceAll("[-\\s]", "");
        if (!KOREAN_MOBILE_NUMBER.matcher(normalized).matches()) {
            throw new ApiException(UserErrorCode.INVALID_PHONE_NUMBER);
        }
        return normalized;
    }
}
