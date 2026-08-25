import { afterEach, describe, expect, it, vi } from 'vitest'
import { missionApi } from './missionApi'

type FetchResult = { success: boolean; data?: unknown; message?: string }

function apiResponse(body: FetchResult, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('missionApi', () => {
  it('loads the current missions for the active Trip with the session cookie', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiResponse({ success: true, data: [{ id: 11, tripId: 1, title: '전통 문화 사진 미션', description: '사진을 촬영해 제출해 주세요.', type: 'ACTIVITY', startAt: null, endAt: null }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(missionApi.getCurrentMissions(1)).resolves.toMatchObject([{ id: 11, type: 'ACTIVITY' }])
    expect(fetchMock).toHaveBeenCalledWith('/api/trips/1/missions/current', { credentials: 'include' })
  })

  it('uploads a captured photo to the presigned URL before submitting its object key', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: { objectKey: 'missions/11/students/2/photo.jpg', uploadUrl: 'https://storage.example/upload' } }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: { submissionId: 9, status: 'WAITING', imageKey: 'missions/11/students/2/photo.jpg' } }))
    vi.stubGlobal('fetch', fetchMock)

    await missionApi.submitPhoto(11, new Blob(['photo'], { type: 'image/jpeg' }))

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/missions/11/photo-upload', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-CSRF-TOKEN': 'csrf-token' }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://storage.example/upload', expect.objectContaining({
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(5, '/api/missions/11/submissions/photo', expect.objectContaining({
      body: JSON.stringify({ objectKey: 'missions/11/students/2/photo.jpg' }),
    }))
  })

  it('sends the four-digit PIN to the mission submission API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(apiResponse({ success: true, data: { submissionId: 10, status: 'COMPLETED', imageKey: '' } }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(missionApi.verifyPin(12, '1234')).resolves.toMatchObject({ status: 'COMPLETED' })
    expect(fetchMock).toHaveBeenLastCalledWith('/api/missions/12/submissions/pin', expect.objectContaining({
      body: JSON.stringify({ pin: '1234' }),
    }))
  })
})
