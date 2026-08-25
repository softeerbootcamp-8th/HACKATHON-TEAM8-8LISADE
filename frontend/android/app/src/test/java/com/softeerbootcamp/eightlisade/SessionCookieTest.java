package com.softeerbootcamp.eightlisade;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

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
}
