/** 교사 알림 유형 — 미션 미완료 · 안전구역 이탈 · 위치 확인 불가 (Figma T-07). */
export type TeacherNotificationCategory = 'MISSION_INCOMPLETED' | 'RANGE_EXIT' | 'UNREACHABLE'

export interface TeacherNotification {
  id: number
  category: TeacherNotificationCategory
  /** 카드 본문 문구 (예: "김하늘이 허용 구역을 벗어났어요.") */
  message: string
  /** 우측 상대 시각 라벨 (예: "방금 전", "3분 전", "14:02") */
  timeLabel: string
}
