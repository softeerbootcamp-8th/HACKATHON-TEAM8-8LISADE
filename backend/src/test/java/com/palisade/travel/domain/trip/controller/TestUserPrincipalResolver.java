package com.palisade.travel.domain.trip.controller;

import com.palisade.travel.domain.user.entity.UserRole;
import com.palisade.travel.global.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

class TestUserPrincipalResolver implements HandlerMethodArgumentResolver {
    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class)
                && parameter.getParameterType().equals(UserPrincipal.class);
    }

    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        HttpServletRequest request = webRequest.getNativeRequest(HttpServletRequest.class);
        if (request != null && request.getRequestURI().startsWith("/api/student/")) {
            return new UserPrincipal(20L, "student", UserRole.STUDENT, "hash", true);
        }
        return new UserPrincipal(10L, "teacher", UserRole.TEACHER, "hash", true);
    }
}
