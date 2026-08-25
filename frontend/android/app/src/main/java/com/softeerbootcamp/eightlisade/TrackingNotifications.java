package com.softeerbootcamp.eightlisade;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

final class TrackingNotifications {
    static final int TRACKING_ID = 1001;
    private static final int SESSION_EXPIRED_ID = 1002;
    private static final String TRACKING_CHANNEL = "location-tracking";
    private static final String SESSION_CHANNEL = "session-expired";

    private TrackingNotifications() {}

    static Notification tracking(Context context) {
        createChannels(context);
        Intent stopIntent = new Intent(context, BackgroundLocationService.class)
            .setAction(BackgroundLocationService.ACTION_STOP);
        PendingIntent stop = PendingIntent.getService(
            context,
            0,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        PendingIntent open = PendingIntent.getActivity(
            context,
            1,
            new Intent(context, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(context, TRACKING_CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.location_notification_title))
            .setContentText(context.getString(R.string.location_notification_body))
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(0, context.getString(R.string.location_notification_stop), stop)
            .build();
    }

    static void showSessionExpired(Context context) {
        createChannels(context);
        PendingIntent open = PendingIntent.getActivity(
            context,
            2,
            new Intent(context, MainActivity.class),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new NotificationCompat.Builder(context, SESSION_CHANNEL)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(context.getString(R.string.session_expired_title))
            .setContentText(context.getString(R.string.session_expired_body))
            .setContentIntent(open)
            .setAutoCancel(true)
            .build();
        context.getSystemService(NotificationManager.class).notify(SESSION_EXPIRED_ID, notification);
    }

    private static void createChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel(
            TRACKING_CHANNEL,
            context.getString(R.string.location_notification_channel),
            NotificationManager.IMPORTANCE_LOW
        ));
        manager.createNotificationChannel(new NotificationChannel(
            SESSION_CHANNEL,
            context.getString(R.string.session_notification_channel),
            NotificationManager.IMPORTANCE_DEFAULT
        ));
    }
}
