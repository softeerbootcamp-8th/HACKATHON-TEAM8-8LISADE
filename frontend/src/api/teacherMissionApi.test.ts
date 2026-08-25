import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherMissionApi } from './missionApi'

type FetchResult = { success: boolean; data?: unknown; message?: string }

function apiResponse(body: FetchResult, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function csrfResponse(): Response {
  return apiResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('teacherMissionApi', () => {
  it('lists missions for a trip', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({ success: true, data: [{ id: 1, tripId: 1, title: '사진 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: null }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherMissionApi.listMissions('1')).resolves.toMatchObject([{ id: 1, tripId: '1', type: 'ACTIVITY', pin: null }])
    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/trips/1/missions', { credentials: 'include' })
  })

  it('fetches the PIN for a check mission after listing it', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ success: true, data: [{ id: 2, tripId: 1, title: '출석체크', description: '', type: 'CHECK', startAt: null, endAt: null }] }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: '3423' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherMissionApi.listMissions('1')).resolves.toMatchObject([{ id: 2, pin: '3423' }])
    expect(fetchMock).toHaveBeenLastCalledWith('/api/teacher/missions/2/pin', { credentials: 'include' })
  })

  it('creates a mission with the resolved start/end times', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(apiResponse({ success: true, data: { id: 3, tripId: 1, title: '활동 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: '2026-08-25T11:00' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(teacherMissionApi.createMission('1', { title: '활동 미션', description: '', type: 'ACTIVITY', dispatchTiming: 'IMMEDIATE', startAt: '2026-08-25T10:00', endAt: '2026-08-25T11:00' })).resolves.toMatchObject({ id: 3 })

    expect(fetchMock).toHaveBeenLastCalledWith('/api/teacher/trips/1/missions', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: '활동 미션', description: '', type: 'ACTIVITY', startAt: null, endAt: '2026-08-25T11:00' }),
    }))
  })

  it('rejects a submission with a reason', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(apiResponse({ success: true, data: null }))
    vi.stubGlobal('fetch', fetchMock)

    await teacherMissionApi.rejectSubmission(1, 101, '사진이 흐릿합니다.')

    expect(fetchMock).toHaveBeenLastCalledWith('/api/teacher/missions/1/submissions/101/reject', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ reason: '사진이 흐릿합니다.' }),
    }))
  })

  it('deletes a mission with the CSRF token', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await teacherMissionApi.deleteMission(5)

    expect(fetchMock).toHaveBeenLastCalledWith('/api/teacher/missions/5', expect.objectContaining({
      method: 'DELETE',
      headers: { 'X-CSRF-TOKEN': 'csrf-token' },
    }))
  })
})
