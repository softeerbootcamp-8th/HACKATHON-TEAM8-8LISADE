/**
 * 백엔드 `NotificationType`과 대응. 교사(§6.1): RANGE_EXIT / MISSION_INCOMPLETED /
 * UNREACHABLE. 학생(§6.2): RANGE_EXIT / MISSION_CREATED / DEADLINE_IMMINENT / MISSION_REJECTED.
 */
export type NotificationType =
  | 'RANGE_EXIT'
  | 'MISSION_INCOMPLETED'
  | 'MISSION_CREATED'
  | 'UNREACHABLE'
  | 'DEADLINE_IMMINENT'
  | 'MISSION_REJECTED'

export interface TeacherNotification {
  id: number
  /** 알림 유형 — 배지 라벨/색상 매핑에 사용. 서버가 새 유형을 보내도 문자열로 안전 처리. */
  type: NotificationType | string
  title: string
  message: string
  /** 서버 저장 시각 (ISO 8601). 카드 우측 시각 라벨은 이 값으로 계산한다. */
  createdAt: string
}

/** 학생 알림(S-06). 구조는 `TeacherNotification`과 동일 — 배지 매핑만 학생용으로 다르다. */
export interface StudentNotification {
  id: number
  type: NotificationType | string
  title: string
  message: string
  createdAt: string
}
