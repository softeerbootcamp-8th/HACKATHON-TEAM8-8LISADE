package com.softeerbootcamp.eightlisade;

enum TrackingResponsePolicy {
    CONTINUE,
    STOP_TRACKING,
    EXPIRE_SESSION;

    static TrackingResponsePolicy fromStatus(int status) {
        if (status == 401) {
            return EXPIRE_SESSION;
        }
        return status == 410 ? STOP_TRACKING : CONTINUE;
    }
}
