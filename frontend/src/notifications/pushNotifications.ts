import { Capacitor } from '@capacitor/core'
import { notificationApi, type NotificationApi } from '../api/notificationApi'
import { deleteFcmToken, listenForForegroundMessages, requestFcmToken } from '../firebase/firebaseConfig'
import { foregroundNotifications } from './foregroundNotifications'
import { nativeFcm } from '../native/fcm'

interface NativeFcmBridge {
  requestToken(): Promise<string | null>
  onTokenRefresh(callback: (token: string) => void): void
  onForegroundMessage(): void
  deleteToken(): Promise<void>
}

interface WebFcmBridge {
  requestToken(): Promise<string | null>
  deleteToken(): Promise<void>
  listenForegroundMessages(): void
}

export function createPushNotifications(
  isNative: boolean,
  native: NativeFcmBridge,
  web: WebFcmBridge,
  api: NotificationApi,
) {
  // 로그아웃 때 서버에서 지울 토큰. 앱을 새로 띄우면 비어 있으므로 그때는 FCM에 다시 물어본다.
  let registeredToken: string | null = null
  const requestToken = () => (isNative ? native.requestToken() : web.requestToken())

  return {
    async register(): Promise<void> {
      const token = await requestToken()
      if (!token) {
        return
      }

      await api.registerDevice(token, isNative ? 'ANDROID' : 'WEB')
      registeredToken = token

      if (isNative) {
        native.onForegroundMessage()
        native.onTokenRefresh((refreshedToken) => {
          registeredToken = refreshedToken
          // 갱신 재등록은 배경 작업이라 실패해도 되돌릴 방법이 없다. 다음 로그인에서 다시 등록된다.
          api.registerDevice(refreshedToken, 'ANDROID').catch(() => undefined)
        })
        return
      }

      web.listenForegroundMessages()
    },

    async unregister(token?: string): Promise<void> {
      const target = token ?? registeredToken ?? await requestToken()
      registeredToken = null

      if (target) {
        await api.unregisterDevice(target)
      }

      await (isNative ? native.deleteToken() : web.deleteToken())
    },
  }
}

// 웹·Android 모두 수신한 포그라운드 알림을 구독 저장소로 넘겨 화면이 토스트/배지로 표시한다(#41).
export const pushNotifications = createPushNotifications(
  Capacitor.isNativePlatform(),
  {
    ...nativeFcm,
    onForegroundMessage: () => nativeFcm.onForegroundMessage(foregroundNotifications.publish),
  },
  {
    requestToken: requestFcmToken,
    deleteToken: deleteFcmToken,
    listenForegroundMessages: () => listenForForegroundMessages(foregroundNotifications.publish),
  },
  notificationApi,
)
