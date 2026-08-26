/**
 * 백엔드 `NotificationType`과 대응. 백엔드는 RANGE_EXIT / MISSION_CREATED /
 * MISSION_INCOMPLETED를 보내며, UNREACHABLE(위치 확인 불가)은 시안(T-07)용으로
 * 미리 둔 유형이다(백엔드 저장이 생기면 자동 표시).
 */
export type NotificationType = 'RANGE_EXIT' | 'MISSION_INCOMPLETED' | 'MISSION_CREATED' | 'UNREACHABLE'

export interface TeacherNotification {
  id: number
  /** 알림 유형 — 배지 라벨/색상 매핑에 사용. 서버가 새 유형을 보내도 문자열로 안전 처리. */
  type: NotificationType | string
  title: string
  message: string
  /** 서버 저장 시각 (ISO 8601). 카드 우측 시각 라벨은 이 값으로 계산한다. */
  createdAt: string
}
