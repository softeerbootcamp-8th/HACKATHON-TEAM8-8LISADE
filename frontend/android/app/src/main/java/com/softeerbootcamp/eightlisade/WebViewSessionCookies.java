package com.softeerbootcamp.eightlisade;

import android.webkit.CookieManager;

import java.net.URI;
import java.util.List;
import java.util.Map;

final class WebViewSessionCookies {
    private WebViewSessionCookies() {}

    static String sessionCookie(String endpoint) {
        return SessionCookie.fromCookieHeader(CookieManager.getInstance().getCookie(endpoint));
    }

    static void storeResponseCookies(String endpoint, Map<String, List<String>> headers) {
        CookieManager cookieManager = CookieManager.getInstance();
        headers.forEach((name, values) -> {
            if (name != null && "Set-Cookie".equalsIgnoreCase(name)) {
                values.forEach(value -> cookieManager.setCookie(endpoint, value));
            }
        });
        cookieManager.flush();
    }

    static void expireSession(String endpoint) {
        if (endpoint == null) {
            return;
        }
        CookieManager cookieManager = CookieManager.getInstance();
        boolean secure = "https".equalsIgnoreCase(URI.create(endpoint).getScheme());
        cookieManager.setCookie(endpoint, SessionCookie.expired(secure));
        cookieManager.flush();
    }
}
