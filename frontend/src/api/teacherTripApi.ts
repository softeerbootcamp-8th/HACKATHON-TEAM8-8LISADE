import type { CreateTeacherTripInput, InviteCode } from '../types/teacherTrip'

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

type CsrfToken = {
  token: string
  headerName: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: 'include', ...init })
  const body = await response.json().catch(() => null) as ApiResponse<T> | null

  if (!response.ok || !body?.success) {
    throw new Error(body?.message ?? '현장체험학습 생성에 실패했습니다.')
  }

  return body.data
}

export const teacherTripApi = {
  async create({ title, date, place, geofencePoints }: CreateTeacherTripInput): Promise<InviteCode> {
    const csrf = await request<CsrfToken>('/api/auth/csrf')

    return request<InviteCode>('/api/teacher/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify({
        title,
        place,
        startAt: `${date}T00:00:00`,
        endAt: `${date}T23:59:59`,
        geofencePoints,
      }),
    })
  },
}
