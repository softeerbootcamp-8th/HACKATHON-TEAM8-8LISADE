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
