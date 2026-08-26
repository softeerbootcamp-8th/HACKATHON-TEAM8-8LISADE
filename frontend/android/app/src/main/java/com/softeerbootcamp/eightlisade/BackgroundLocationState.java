package com.softeerbootcamp.eightlisade;

import android.content.Context;
import android.content.SharedPreferences;

final class BackgroundLocationState {
    private static final String PREFERENCES = "background-location";
    private static final String ENDPOINT = "location-endpoint";
    private static final String REASON = "reason";

    private BackgroundLocationState() {}

    static void saveEndpoint(Context context, String endpoint) {
        preferences(context).edit().putString(ENDPOINT, endpoint).remove(REASON).apply();
    }

    static String endpoint(Context context) {
        return preferences(context).getString(ENDPOINT, null);
    }

    static void clearSession(Context context) {
        preferences(context).edit().remove(ENDPOINT).remove(REASON).apply();
    }

    static void markSessionExpired(Context context) {
        preferences(context).edit().putString(REASON, "SESSION_EXPIRED").apply();
    }

    static void markTripEnded(Context context) {
        preferences(context).edit().putString(REASON, "TRIP_ENDED").apply();
    }

    static String reason(Context context) {
        return preferences(context).getString(REASON, null);
    }

    private static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE);
    }
}
