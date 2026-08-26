package com.softeerbootcamp.eightlisade;

import java.net.URL;

final class LocationEndpointPolicy {
    private LocationEndpointPolicy() {}

    static boolean isAllowed(String endpoint, boolean localDebug) {
        try {
            URL url = new URL(endpoint);
            if (url.getHost().isEmpty() || url.getUserInfo() != null) {
                return false;
            }
            if ("https".equals(url.getProtocol())) {
                return true;
            }
            return localDebug && "http".equals(url.getProtocol()) && isLocalhost(url.getHost());
        } catch (Exception ignored) {
            return false;
        }
    }

    private static boolean isLocalhost(String host) {
        return "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host) || "[::1]".equals(host);
    }
}
