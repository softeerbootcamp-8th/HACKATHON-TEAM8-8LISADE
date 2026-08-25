package com.softeerbootcamp.eightlisade;

import java.net.CookieHandler;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.URI;

final class NativeSessionCookieStore {
    private static final String NAME = "JSESSIONID";
    private static final CookieManager COOKIE_MANAGER = new CookieManager(null, CookiePolicy.ACCEPT_ORIGINAL_SERVER);

    static {
        CookieHandler.setDefault(COOKIE_MANAGER);
    }

    private NativeSessionCookieStore() {}

    static boolean syncFromWebView(String endpoint) {
        expire(endpoint);
        String header = WebViewSessionCookies.sessionCookie(endpoint);
        if (header == null) {
            return false;
        }

        URI uri = URI.create(endpoint);
        HttpCookie cookie = new HttpCookie(NAME, header.substring(header.indexOf('=') + 1));
        cookie.setDomain(uri.getHost());
        cookie.setPath(uri.getPath().isEmpty() ? "/" : uri.getPath());
        cookie.setSecure(true);
        cookie.setHttpOnly(true);
        COOKIE_MANAGER.getCookieStore().add(uri, cookie);
        return true;
    }

    static void expire(String endpoint) {
        if (endpoint == null) {
            return;
        }
        URI uri = URI.create(endpoint);
        COOKIE_MANAGER.getCookieStore().get(uri).stream()
            .filter(cookie -> NAME.equals(cookie.getName()))
            .forEach(cookie -> COOKIE_MANAGER.getCookieStore().remove(uri, cookie));
    }
}
