import { sendJson } from './httpClient'

export type DevicePlatform = 'WEB' | 'ANDROID'

export interface NotificationApi {
  registerDevice(token: string, platform: DevicePlatform): Promise<void>
  unregisterDevice(token: string): Promise<void>
}

const DEVICES_PATH = '/api/notifications/devices'

export const notificationApi: NotificationApi = {
  registerDevice(token, platform) {
    return sendJson(DEVICES_PATH, 'POST', { token, platform })
  },
  unregisterDevice(token) {
    return sendJson(DEVICES_PATH, 'DELETE', { token })
  },
}
