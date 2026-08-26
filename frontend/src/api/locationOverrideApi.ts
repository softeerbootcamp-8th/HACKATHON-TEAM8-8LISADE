import { csrfJsonHeaders, request } from './httpClient'

export interface LocationOverrideState {
  enabled: boolean
  latitude: number | null
  longitude: number | null
}

export type LocationPoint = {
  latitude: number
  longitude: number
}

const PATH = '/api/student/locations/override'

export const locationOverrideApi = {
  get() {
    return request<LocationOverrideState>(PATH)
  },
  async enable(point: LocationPoint) {
    return request<LocationOverrideState>(PATH, {
      method: 'PUT',
      headers: await csrfJsonHeaders(),
      body: JSON.stringify(point),
    })
  },
  async disable() {
    return request<LocationOverrideState>(PATH, {
      method: 'DELETE',
      headers: await csrfJsonHeaders(),
    })
  },
}
