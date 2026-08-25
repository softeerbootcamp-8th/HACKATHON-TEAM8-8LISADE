package com.softeerbootcamp.eightlisade;

import android.Manifest;
import android.os.Build;

import androidx.core.location.LocationManagerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.net.URL;

@CapacitorPlugin(
    name = "BackgroundLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }
        ),
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class BackgroundLocationPlugin extends Plugin {
    @PluginMethod
    public void syncSession(PluginCall call) {
        String endpoint = call.getString("locationEndpoint");
        if (!validEndpoint(endpoint)) {
            call.reject("HTTPS 위치 API 주소가 필요합니다.", "INVALID_ENDPOINT");
            return;
        }
        if (!NativeSessionCookieStore.syncFromWebView(endpoint)) {
            call.reject("WebView에 로그인 세션이 없습니다.", "SESSION_MISSING");
            return;
        }

        BackgroundLocationState.saveEndpoint(getContext(), endpoint);
        call.resolve(status());
    }

    @PluginMethod
    public void expireSession(PluginCall call) {
        BackgroundLocationService.stop(getContext());
        String endpoint = BackgroundLocationState.endpoint(getContext());
        NativeSessionCookieStore.expire(endpoint);
        WebViewSessionCookies.expireSession(endpoint);
        BackgroundLocationState.clearSession(getContext());
        call.resolve(status());
    }

    @PluginMethod
    public void startTracking(PluginCall call) {
        if (!hasSession()) {
            call.reject("로그인 세션을 먼저 동기화해야 합니다.", "SESSION_MISSING");
            return;
        }
        if (!LocationManagerCompat.isLocationEnabled((android.location.LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE))) {
            call.reject("기기 위치 서비스가 꺼져 있습니다.", "LOCATION_DISABLED");
            return;
        }
        if (!permissionsGranted()) {
            requestPermissionForAliases(new String[] { "location", "notifications" }, call, "startAfterPermission");
            return;
        }
        start(call);
    }

    @PermissionCallback
    private void startAfterPermission(PluginCall call) {
        if (!permissionsGranted()) {
            call.reject("위치 또는 알림 권한이 거부되었습니다.", "PERMISSION_DENIED");
            return;
        }
        start(call);
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        BackgroundLocationService.stop(getContext());
        call.resolve(status());
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(status());
    }

    private void start(PluginCall call) {
        BackgroundLocationService.start(getContext());
        call.resolve(status());
    }

    private boolean hasSession() {
        String endpoint = BackgroundLocationState.endpoint(getContext());
        return endpoint != null && WebViewSessionCookies.sessionCookie(endpoint) != null;
    }

    private boolean permissionsGranted() {
        boolean location = getPermissionState("location") == PermissionState.GRANTED;
        boolean notifications = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED;
        return location && notifications;
    }

    private boolean validEndpoint(String endpoint) {
        try {
            URL url = new URL(endpoint);
            return "https".equals(url.getProtocol()) && !url.getHost().isEmpty() && url.getUserInfo() == null;
        } catch (Exception ignored) {
            return false;
        }
    }

    private JSObject status() {
        JSObject status = new JSObject();
        status.put("supported", true);
        status.put("tracking", BackgroundLocationService.isTracking());
        status.put("sessionAvailable", hasSession());
        String reason = BackgroundLocationState.reason(getContext());
        if (reason != null) {
            status.put("reason", reason);
        }
        return status;
    }
}
