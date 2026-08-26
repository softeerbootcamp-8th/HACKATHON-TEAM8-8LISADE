import { authApi, type AuthApi } from '../../api/authApi'
import { locationTrackingAdapter } from '../../api/locationTrackingApi'
import { pushNotifications } from '../../notifications/pushNotifications'

interface PushRegistration {
  unregister(token?: string): Promise<void>
}

interface LocationTracking {
  stopTracking(): Promise<unknown>
  expireSession(): Promise<unknown>
}

export function createLogout(
  push: PushRegistration,
  api: Pick<AuthApi, 'logout'>,
  tracking: LocationTracking,
) {
  return async function logout(): Promise<void> {
    // 서버 토큰 삭제에는 세션 쿠키가 필요하므로 로그아웃 API보다 먼저 호출한다.
    // 알림 권한 거부나 FCM 장애가 로그아웃 자체를 막아서는 안 된다.
    await push.unregister().catch(() => undefined)
    await tracking.stopTracking().catch(() => undefined)
    try {
      await api.logout()
    } finally {
      await tracking.expireSession().catch(() => undefined)
    }
  }
}

export const logout = createLogout(pushNotifications, authApi, locationTrackingAdapter)
