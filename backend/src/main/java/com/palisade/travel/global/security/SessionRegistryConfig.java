package com.palisade.travel.global.security;

import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.web.session.HttpSessionEventPublisher;

/**
 * 유저 기준으로 활성 세션을 조회/강제 만료할 수 있도록 Spring Security의
 * {@link SessionRegistry}를 도입한다. {@link HttpSessionEventPublisher}가
 * 서블릿 컨테이너의 세션 생성/파괴 이벤트를 SessionRegistry에 반영해준다.
 */
@Configuration
public class SessionRegistryConfig {

    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }

    @Bean
    public ServletListenerRegistrationBean<HttpSessionEventPublisher> httpSessionEventPublisher() {
        return new ServletListenerRegistrationBean<>(new HttpSessionEventPublisher());
    }
}
