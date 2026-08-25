package com.softeerbootcamp.eightlisade;

import android.Manifest;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.SystemClock;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class BackgroundLocationService extends Service {
    static final String ACTION_STOP = "com.softeerbootcamp.eightlisade.STOP_LOCATION";
    private static final long INTERVAL_MILLIS = 30_000;
    private static final AtomicBoolean TRACKING = new AtomicBoolean(false);

    private final AtomicBoolean uploading = new AtomicBoolean(false);
    private final NativeLocationHttpClient httpClient = new NativeLocationHttpClient();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private ExecutorService executor;
    private FusedLocationProviderClient locationClient;
    private long lastSentAt;

    private final LocationCallback locationCallback = new LocationCallback() {
        @Override
        public void onLocationResult(LocationResult result) {
            Location location = result.getLastLocation();
            long now = SystemClock.elapsedRealtime();
            if (location != null && now - lastSentAt >= INTERVAL_MILLIS && uploading.compareAndSet(false, true)) {
                lastSentAt = now;
                executor.execute(() -> upload(location));
            }
        }
    };

    static void start(Context context) {
        TRACKING.set(true);
        ContextCompat.startForegroundService(context, new Intent(context, BackgroundLocationService.class));
    }

    static void stop(Context context) {
        TRACKING.set(false);
        context.stopService(new Intent(context, BackgroundLocationService.class));
    }

    static boolean isTracking() {
        return TRACKING.get();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        executor = Executors.newSingleThreadExecutor();
        locationClient = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopTracking();
            return START_NOT_STICKY;
        }

        startForeground(TrackingNotifications.TRACKING_ID, TrackingNotifications.tracking(this));
        requestLocationUpdates();
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopTracking();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        locationClient.removeLocationUpdates(locationCallback);
        TRACKING.set(false);
        executor.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void requestLocationUpdates() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            stopTracking();
            return;
        }

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MILLIS)
            .setMinUpdateIntervalMillis(INTERVAL_MILLIS)
            .setMaxUpdateDelayMillis(INTERVAL_MILLIS)
            .build();
        locationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    }

    private void upload(Location location) {
        try {
            String endpoint = BackgroundLocationState.endpoint(this);
            if (endpoint == null || TrackingResponsePolicy.fromStatus(httpClient.send(endpoint, location)) == TrackingResponsePolicy.EXPIRE_SESSION) {
                mainHandler.post(this::expireSession);
            }
        } catch (Exception ignored) {
            // 다음 30초 위치에서 다시 시도한다. 쿠키와 위치 값은 로그에 남기지 않는다.
        } finally {
            uploading.set(false);
        }
    }

    private void expireSession() {
        String endpoint = BackgroundLocationState.endpoint(this);
        NativeSessionCookieStore.expire(endpoint);
        WebViewSessionCookies.expireSession(endpoint);
        BackgroundLocationState.markSessionExpired(this);
        TrackingNotifications.showSessionExpired(this);
        stopTracking();
    }

    private void stopTracking() {
        locationClient.removeLocationUpdates(locationCallback);
        TRACKING.set(false);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }
}
