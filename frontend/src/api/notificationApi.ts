export type DevicePlatform = 'WEB' | 'ANDROID'

export interface NotificationApi {
  registerDevice(token: string, platform: DevicePlatform): Promise<void>
  unregisterDevice(token: string): Promise<void>
}

export const notificationApi: NotificationApi = {
  async registerDevice(token, platform) {
    await fetch('/api/notifications/devices', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, platform }),
    })
  },
  async unregisterDevice(token) {
    await fetch('/api/notifications/devices', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  },
}
