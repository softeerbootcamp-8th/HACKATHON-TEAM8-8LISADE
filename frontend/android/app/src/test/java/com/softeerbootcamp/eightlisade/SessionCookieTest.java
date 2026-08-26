package com.softeerbootcamp.eightlisade;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class SessionCookieTest {
    @Test
    public void Given_여러쿠키_When_세션쿠키추출_Then_JSESSIONID만반환한다() {
        String cookie = SessionCookie.fromCookieHeader("theme=dark; JSESSIONID=session-value; locale=ko");

        assertEquals("JSESSIONID=session-value", cookie);
    }

    @Test
    public void Given_세션쿠키없음_When_세션쿠키추출_Then_null을반환한다() {
        String cookie = SessionCookie.fromCookieHeader("theme=dark; locale=ko");

        assertNull(cookie);
    }

    @Test
    public void Given_로컬_HTTP_When_세션쿠키만료_Then_Secure속성을_붙이지않는다() {
        String cookie = SessionCookie.expired(false);

        assertFalse(cookie.contains("Secure"));
    }

    @Test
    public void Given_운영_HTTPS_When_세션쿠키만료_Then_Secure속성을_유지한다() {
        String cookie = SessionCookie.expired(true);

        assertTrue(cookie.contains("Secure"));
    }
}
