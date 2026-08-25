import type { TeacherNotification } from '../types/notification'

export interface TeacherNotificationApi {
  listNotifications(tripId: string): Promise<TeacherNotification[]>
}

/**
 * Figma T-07 시안의 알림 문구를 그대로 시드로 둔다. 실제 알림 조회 API가 없어
 * 기존 mock 패턴(mockTeacherMissionApi)을 따라 인메모리 시드로 렌더한다.
 * §6.1의 "같은 학생·같은 사유 재알림 억제"를 반영해 학생+사유 조합은 중복되지 않게 두었다.
 */
function seedNotificationsByTrip(): Record<string, TeacherNotification[]> {
  return {
    'trip-1': [
      { id: 1, category: 'MISSION_INCOMPLETED', message: `학생1이 '어디서 사진 찍기' 미션을 수행하지 않았어요.`, timeLabel: '방금 전' },
      { id: 2, category: 'RANGE_EXIT', message: '김하늘이 허용 구역을 벗어났어요.', timeLabel: '3분 전' },
      { id: 3, category: 'MISSION_INCOMPLETED', message: `학생3이 '어디서 사진 찍기' 미션을 수행하지 않았어요.`, timeLabel: '10분 전' },
      { id: 4, category: 'UNREACHABLE', message: '박서준의 위치가 5분 이상 수신되지 않았어요.', timeLabel: '14:02' },
      { id: 5, category: 'MISSION_INCOMPLETED', message: `학생5가 '버스 출석체크' 미션을 수행하지 않았어요.`, timeLabel: '13:40' },
      { id: 6, category: 'MISSION_INCOMPLETED', message: `학생2가 '어디서 사진 찍기' 미션을 수행하지 않았어요.`, timeLabel: '13:12' },
    ],
  }
}

let notificationsByTrip = seedNotificationsByTrip()

export function resetMockTeacherNotificationStore() {
  notificationsByTrip = seedNotificationsByTrip()
}

/** useState lazy initializer용 동기 스냅샷 (mockTeacherMissionStore와 동일한 mock 편의). */
export const mockTeacherNotificationStore = {
  notificationsSnapshot: (tripId: string): TeacherNotification[] => notificationsByTrip[tripId] ?? [],
}

export const mockTeacherNotificationApi: TeacherNotificationApi = {
  async listNotifications(tripId) {
    return notificationsByTrip[tripId] ?? []
  },
}
