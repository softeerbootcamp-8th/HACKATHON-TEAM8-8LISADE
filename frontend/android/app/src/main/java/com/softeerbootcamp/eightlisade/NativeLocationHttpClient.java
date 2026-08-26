package com.softeerbootcamp.eightlisade;

import android.location.Location;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

final class NativeLocationHttpClient {
    int send(String endpoint, Location location) throws Exception {
        String sessionCookie = WebViewSessionCookies.sessionCookie(endpoint);
        if (sessionCookie == null) {
            return 401;
        }

        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setConnectTimeout(10_000);
        connection.setReadTimeout(10_000);
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("Cookie", sessionCookie);
        connection.setDoOutput(true);

        byte[] body = payload(location).toString().getBytes(StandardCharsets.UTF_8);
        connection.setFixedLengthStreamingMode(body.length);
        try (OutputStream output = connection.getOutputStream()) {
            output.write(body);
        }

        int status = connection.getResponseCode();
        if (status != 401) {
            WebViewSessionCookies.storeResponseCookies(endpoint, connection.getHeaderFields());
        }
        connection.disconnect();
        return status;
    }

    private JSONObject payload(Location location) throws Exception {
        return new JSONObject()
            .put("latitude", location.getLatitude())
            .put("longitude", location.getLongitude())
            .put("accuracy", location.hasAccuracy() ? location.getAccuracy() : JSONObject.NULL)
            .put("recordedAt", iso8601(location.getTime()));
    }

    private String iso8601(long time) {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date(time));
    }
}
