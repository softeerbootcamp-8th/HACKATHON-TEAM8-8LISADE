import type { StudentNotification } from '../types/notification'
import { apiUrl } from './apiUrl'

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

export interface StudentNotificationApi {
  /** 학생에게 온 모든 알림을 최신순으로 조회한다(유형 무관). */
  list(): Promise<StudentNotification[]>
}

export const studentNotificationApi: StudentNotificationApi = {
  async list() {
    const response = await fetch(apiUrl('/api/student/notifications'), { credentials: 'include' })
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
