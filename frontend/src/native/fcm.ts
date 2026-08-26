import { Capacitor } from '@capacitor/core'
import { PushNotifications, type PushNotificationsPlugin } from '@capacitor/push-notifications'

export function createNativeFcm(plugin: PushNotificationsPlugin, isNative: boolean) {
  return {
    async requestToken(): Promise<string | null> {
      if (!isNative) {
        return null
      }
      const permission = await plugin.requestPermissions()
      if (permission.receive !== 'granted') {
        return null
      }
      return new Promise((resolve) => {
        plugin.addListener('registration', (token) => resolve(token.value))
        plugin.addListener('registrationError', () => resolve(null))
        plugin.register()
      })
    },

    /**
     * 포그라운드 push를 화면으로 넘긴다(#41). Android는 앱이 포그라운드일 때
     * notification 메시지를 트레이에 자동 표시하지 않고 이 이벤트로만 전달하므로,
     * 인앱 토스트와 OS 알림이 겹치지 않는다.
     */
    onForegroundMessage(callback: (notification: { title: string; body: string }) => void): void {
      if (!isNative) {
        return
      }
      plugin.addListener('pushNotificationReceived', (notification) => {
        if (notification.title) {
          callback({ title: notification.title, body: notification.body ?? '' })
        }
      })
    },

    onTokenRefresh(callback: (token: string) => void): void {
      if (!isNative) {
        return
      }
      plugin.addListener('registration', (token) => callback(token.value))
    },

    async deleteToken(): Promise<void> {
      if (!isNative) {
        return
      }
      await plugin.unregister()
    },
  }
}

export const nativeFcm = createNativeFcm(PushNotifications, Capacitor.isNativePlatform())
