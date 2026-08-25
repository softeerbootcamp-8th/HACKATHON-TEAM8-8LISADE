import type { LocationTrackingState } from '../types/studentTrip'

export interface LocationTrackingAdapter {
  getState(): Promise<LocationTrackingState>
  requestPermission(): Promise<LocationTrackingState>
  openSettings(): Promise<void>
}

let state: LocationTrackingState = { permission: 'PENDING', sendStatus: 'NO_PERMISSION', lastSentAt: null }

export const mockLocationTrackingAdapter: LocationTrackingAdapter = {
  async getState() { return state },
  async requestPermission() {
    state = { permission: 'GRANTED', sendStatus: 'NORMAL', lastSentAt: '방금 전' }
    return state
  },
  async openSettings() { return Promise.resolve() },
}
