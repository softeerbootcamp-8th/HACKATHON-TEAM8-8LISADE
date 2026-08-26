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
    static final long COLLECTION_INTERVAL_MILLIS = 1_000;
    static final long UPLOAD_INTERVAL_MILLIS = 10_000;
    static final long MAX_LOCATION_AGE_MILLIS = 10_000;
    private static final AtomicBoolean TRACKING = new AtomicBoolean(false);

    private final AtomicBoolean uploading = new AtomicBoolean(false);
    private final NativeLocationHttpClient httpClient = new NativeLocationHttpClient();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private ExecutorService executor;
    private FusedLocationProviderClient locationClient;
    private Location latestLocation;
    private long lastAttemptedRecordedAt = Long.MIN_VALUE;

    private final LocationCallback locationCallback = new LocationCallback() {
        @Override
        public void onLocationResult(LocationResult result) {
            Location location = result.getLastLocation();
            if (location != null) {
                latestLocation = location;
            }
        }
    };

    private final Runnable uploadRunnable = new Runnable() {
        @Override
        public void run() {
            uploadLatestLocation();
            mainHandler.postDelayed(this, UPLOAD_INTERVAL_MILLIS);
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
        mainHandler.removeCallbacks(uploadRunnable);
        mainHandler.postDelayed(uploadRunnable, UPLOAD_INTERVAL_MILLIS);
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
        mainHandler.removeCallbacks(uploadRunnable);
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

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, COLLECTION_INTERVAL_MILLIS)
            .setMinUpdateIntervalMillis(COLLECTION_INTERVAL_MILLIS)
            .setMaxUpdateDelayMillis(COLLECTION_INTERVAL_MILLIS)
            .build();
        locationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
    }

    private void uploadLatestLocation() {
        Location location = latestLocation;
        if (location == null) {
            return;
        }

        long nowElapsedNanos = SystemClock.elapsedRealtimeNanos();
        if (!LocationUploadPolicy.isFresh(nowElapsedNanos, location.getElapsedRealtimeNanos(), MAX_LOCATION_AGE_MILLIS)) {
            return;
        }
        if (!LocationUploadPolicy.isNewer(location.getTime(), lastAttemptedRecordedAt)) {
            return;
        }
        if (!uploading.compareAndSet(false, true)) {
            return;
        }

        lastAttemptedRecordedAt = location.getTime();
        executor.execute(() -> upload(location));
    }

    private void upload(Location location) {
        try {
            String endpoint = BackgroundLocationState.endpoint(this);
            if (endpoint == null) {
                mainHandler.post(this::expireSession);
                return;
            }

            TrackingResponsePolicy policy = TrackingResponsePolicy.fromStatus(httpClient.send(endpoint, location));
            if (policy == TrackingResponsePolicy.EXPIRE_SESSION) {
                mainHandler.post(this::expireSession);
            } else if (policy == TrackingResponsePolicy.STOP_TRACKING) {
                mainHandler.post(this::endTrip);
            }
        } catch (Exception ignored) {
            // 다음 전송 주기에서 새로 수집한 좌표를 처리한다.
        } finally {
            uploading.set(false);
        }
    }

    private void expireSession() {
        String endpoint = BackgroundLocationState.endpoint(this);
        WebViewSessionCookies.expireSession(endpoint);
        BackgroundLocationState.markSessionExpired(this);
        TrackingNotifications.showSessionExpired(this);
        stopTracking();
    }

    private void endTrip() {
        BackgroundLocationState.markTripEnded(this);
        stopTracking();
    }

    private void stopTracking() {
        mainHandler.removeCallbacks(uploadRunnable);
        locationClient.removeLocationUpdates(locationCallback);
        TRACKING.set(false);
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }
}
