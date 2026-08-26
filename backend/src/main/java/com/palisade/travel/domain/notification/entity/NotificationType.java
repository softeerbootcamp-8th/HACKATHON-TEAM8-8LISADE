package com.palisade.travel.domain.notification.entity;

public enum NotificationType {
    /** 안전 구역 이탈 — 학생 이탈 판정 시 담당 교사와 학생 본인에게 각각 1회(해제 후 재이탈 시 재발송). */
    RANGE_EXIT,
    /** 새 미션 등록 알림 — 미션 생성 시 참여 학생 전원에게. */
    MISSION_CREATED,
    /** 미션 미완료 — 미션 마감 시각에 미완료 학생이 있을 때 미션당 1회(미완료 인원 요약, 교사 수신). 출석체크는 마감이 없어 미발송. */
    MISSION_INCOMPLETED,
    /** 위치 확인 불가 — 확인 불가 3분 지속 시 학생당 1회(교사 수신). */
    UNREACHABLE,
    /** 마감 임박 — 마감 5분 전, 그 시점까지 미완료인 학생에게만. */
    DEADLINE_IMMINENT,
    /** 다시 하기 — 교사가 활동 미션 제출을 반려했을 때 해당 학생에게. */
    MISSION_REJECTED
}
