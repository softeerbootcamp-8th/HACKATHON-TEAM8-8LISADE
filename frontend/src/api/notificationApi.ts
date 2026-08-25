export interface NotificationApi {
  registerDevice(token: string, platform: 'WEB'): Promise<void>
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
