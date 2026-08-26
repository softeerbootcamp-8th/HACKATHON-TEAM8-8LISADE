package com.softeerbootcamp.eightlisade;

import java.util.concurrent.TimeUnit;

final class LocationUploadPolicy {
    private LocationUploadPolicy() {}

    static boolean isFresh(long nowElapsedNanos, long recordedElapsedNanos, long maxAgeMillis) {
        long ageNanos = nowElapsedNanos - recordedElapsedNanos;
        return ageNanos >= 0 && ageNanos <= TimeUnit.MILLISECONDS.toNanos(maxAgeMillis);
    }

    static boolean isNewer(long recordedAt, long lastAttemptedRecordedAt) {
        return recordedAt > lastAttemptedRecordedAt;
    }
}
