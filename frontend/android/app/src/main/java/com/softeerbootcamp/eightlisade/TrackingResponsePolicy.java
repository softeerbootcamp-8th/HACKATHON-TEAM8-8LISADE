package com.softeerbootcamp.eightlisade;

enum TrackingResponsePolicy {
    CONTINUE,
    EXPIRE_SESSION;

    static TrackingResponsePolicy fromStatus(int status) {
        return status == 401 ? EXPIRE_SESSION : CONTINUE;
    }
}
