import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { studentTripApi } from './studentTripApi'

const activeTripResponse = {
  success: true,
  data: { tripId: 7, title: '경복궁 현장체험학습', place: '경복궁', status: 'ACTIVE' },
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response
}

describe('studentTripApi', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('loads the active Trip from the authenticated session', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(activeTripResponse))

    const trip = await studentTripApi.getActiveTrip()

    expect(fetchMock).toHaveBeenCalledWith('/api/student/trips/active', { credentials: 'include' })
    expect(trip).toMatchObject({ id: 7, title: '경복궁 현장체험학습', place: '경복궁', status: 'ACTIVE' })
  })

  it('gets a CSRF token before joining a Trip with an invite code', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse(activeTripResponse))

    await studentTripApi.joinWithInviteCode('AB1234')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/student/trips/join', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({ code: 'AB1234' }),
    })
  })
})
