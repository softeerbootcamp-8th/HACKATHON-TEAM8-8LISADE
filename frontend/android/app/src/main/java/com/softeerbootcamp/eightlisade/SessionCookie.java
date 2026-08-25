package com.softeerbootcamp.eightlisade;

final class SessionCookie {
    private static final String NAME = "JSESSIONID";

    private SessionCookie() {}

    static String fromCookieHeader(String header) {
        if (header == null) {
            return null;
        }

        for (String part : header.split(";")) {
            String cookie = part.trim();
            int separator = cookie.indexOf('=');
            if (separator > 0 && NAME.equals(cookie.substring(0, separator)) && separator < cookie.length() - 1) {
                return cookie;
            }
        }
        return null;
    }
}
