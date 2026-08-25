import { Capacitor } from '@capacitor/core'
import { notificationApi, type NotificationApi } from '../api/notificationApi'
import { deleteFcmToken, requestFcmToken } from '../firebase/firebaseConfig'
import { nativeFcm } from '../native/fcm'

interface NativeFcmBridge {
  requestToken(): Promise<string | null>
  onTokenRefresh(callback: (token: string) => void): void
  deleteToken(): Promise<void>
}

interface WebFcmBridge {
  requestToken(): Promise<string | null>
  deleteToken(): Promise<void>
}

export function createPushNotifications(
  isNative: boolean,
  native: NativeFcmBridge,
  web: WebFcmBridge,
  api: NotificationApi,
) {
  return {
    async register(): Promise<void> {
      const token = isNative ? await native.requestToken() : await web.requestToken()
      if (!token) {
        return
      }

      await api.registerDevice(token, isNative ? 'ANDROID' : 'WEB')

      if (isNative) {
        native.onTokenRefresh((refreshedToken) => {
          api.registerDevice(refreshedToken, 'ANDROID')
        })
      }
    },

    async unregister(token: string): Promise<void> {
      await api.unregisterDevice(token)
      await (isNative ? native.deleteToken() : web.deleteToken())
    },
  }
}

export const pushNotifications = createPushNotifications(
  Capacitor.isNativePlatform(),
  nativeFcm,
  { requestToken: requestFcmToken, deleteToken: deleteFcmToken },
  notificationApi,
)
