import type { TeacherNotification } from '../types/notification'
import { apiFetch } from './httpClient'

type ApiResponse<T> = { success: boolean; data: T; message?: string }

type NotificationResponse = {
  id: number
  type: string
  tripId: number | null
  missionId: number | null
  title: string
  message: string
  createdAt: string
}

export interface TeacherNotificationApi {
  /** 교사에게 온 모든 알림을 최신순으로 조회한다(유형 무관). */
  list(): Promise<TeacherNotification[]>
}

export const teacherNotificationApi: TeacherNotificationApi = {
  async list() {
    const response = await apiFetch('/api/teacher/notifications')
    const body = await response.json().catch(() => null) as ApiResponse<NotificationResponse[]> | null
    if (!response.ok || !body?.success) {
      throw new Error(body?.message ?? '알림을 불러오지 못했습니다.')
    }
    return body.data.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
    }))
  },
}
