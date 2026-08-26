package com.palisade.travel.domain.user.controller;

import com.palisade.travel.domain.user.dto.CsrfTokenResponse;
import com.palisade.travel.domain.user.dto.CurrentUserResponse;
import com.palisade.travel.domain.user.dto.LoginRequest;
import com.palisade.travel.domain.user.dto.SignUpRequest;
import com.palisade.travel.domain.user.exception.UserErrorCode;
import com.palisade.travel.domain.user.exception.UserException;
import com.palisade.travel.domain.user.service.UserSignUpService;
import com.palisade.travel.global.api.ApiResponse;
import com.palisade.travel.global.security.SessionAuthenticationService;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class UserAuthController {

    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationService sessionAuthenticationService;
    private final UserSignUpService userSignUpService;

    @PostMapping("/signup")
    public ApiResponse<Void> signUp(@Valid @RequestBody SignUpRequest request) {
        userSignUpService.signUp(request);
        return ApiResponse.success(null);
    }

    @PostMapping("/login")
    public ApiResponse<CurrentUserResponse> login(@Valid @RequestBody LoginRequest request,
                                                   HttpServletRequest servletRequest,
                                                   HttpServletResponse servletResponse) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.loginId(), request.password()));
            sessionAuthenticationService.login(authentication, servletRequest, servletResponse);
            return ApiResponse.success(CurrentUserResponse.from((UserPrincipal) authentication.getPrincipal()));
        } catch (DisabledException exception) {
            throw new UserException(UserErrorCode.ACCOUNT_DISABLED);
        } catch (AuthenticationException exception) {
            throw new UserException(UserErrorCode.INVALID_CREDENTIALS);
        }
    }

    @GetMapping("/me")
    public ApiResponse<CurrentUserResponse> me(@AuthenticationPrincipal UserPrincipal user) {
        return ApiResponse.success(CurrentUserResponse.from(user));
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request) {
        sessionAuthenticationService.logout(request);
        return ApiResponse.success(null);
    }

    @GetMapping("/csrf")
    public ApiResponse<CsrfTokenResponse> csrf(CsrfToken csrfToken) {
        return ApiResponse.success(CsrfTokenResponse.from(csrfToken));
    }

}
