import { afterEach, describe, expect, it, vi } from 'vitest'
import { locationOverrideApi } from './locationOverrideApi'

describe('수동 위치 API', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Given 학생 세션 When 수동 위치 상태를 조회하면 Then 현재 모드와 좌표를 반환한다', async () => {
    // given
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: true,
      data: { enabled: true, latitude: 37.501, longitude: 127.001 },
    }))
    vi.stubGlobal('fetch', fetchMock)

    // when
    const state = await locationOverrideApi.get()

    // then
    expect(state).toEqual({ enabled: true, latitude: 37.501, longitude: 127.001 })
    expect(fetchMock).toHaveBeenCalledWith('/api/student/locations/override', { credentials: 'include' })
  })

  it('Given 선택 좌표 When 수동 위치를 활성화하면 Then CSRF 토큰과 좌표를 전송한다', async () => {
    // given
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { enabled: true, latitude: 37.501, longitude: 127.001 } }))
    vi.stubGlobal('fetch', fetchMock)

    // when
    await locationOverrideApi.enable({ latitude: 37.501, longitude: 127.001 })

    // then
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/student/locations/override', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({ latitude: 37.501, longitude: 127.001 }),
    })
  })

  it('Given 수동 위치 모드 When 자동 위치로 복귀하면 Then CSRF 토큰과 해제 요청을 전송한다', async () => {
    // given
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { enabled: false, latitude: null, longitude: null } }))
    vi.stubGlobal('fetch', fetchMock)

    // when
    await locationOverrideApi.disable()

    // then
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/student/locations/override', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
    })
  })
})

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}
