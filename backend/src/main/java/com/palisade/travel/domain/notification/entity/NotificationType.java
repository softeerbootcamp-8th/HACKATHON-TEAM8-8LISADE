package com.palisade.travel.domain.notification.entity;

public enum NotificationType {
    /** 안전 구역 이탈 — 학생 이탈 판정 시 학생당 1회(해제 후 재이탈 시 재발송). */
    RANGE_EXIT,
    /** 새 미션 등록 알림. */
    MISSION_CREATED,
    /** 미션 미완료 — 미션 마감 시각에 미완료 학생이 있을 때 미션당 1회(미완료 인원 요약). 출석체크는 마감이 없어 미발송. */
    MISSION_INCOMPLETED,
    /** 위치 확인 불가 — 확인 불가 3분 지속 시 학생당 1회. */
    UNREACHABLE
}
