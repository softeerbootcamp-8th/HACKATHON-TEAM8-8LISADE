import { afterEach, describe, expect, it, vi } from 'vitest'
import { teacherTripApi } from './teacherTripApi'

function jsonResponse(data: unknown, ok = true) {
  return { ok, json: async () => data } as Response
}

describe('teacherTripApi', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('CSRF 토큰과 20m 버퍼 좌표를 포함해 체험학습 생성을 요청한다', async () => {
    // given
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { code: 'AB1234', expiresAt: '2026-08-25T09:05:00' } }))
    vi.stubGlobal('fetch', fetchMock)
    const geofencePoints = [
      { latitude: 37.523, longitude: 126.98 },
      { latitude: 37.524, longitude: 126.981 },
      { latitude: 37.522, longitude: 126.982 },
    ]

    // when
    await teacherTripApi.create({ title: '국립중앙박물관', date: '2026-08-25', place: '국립중앙박물관', geofencePoints })

    // then
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/csrf', { credentials: 'include' })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/teacher/trips', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({
        title: '국립중앙박물관',
        place: '국립중앙박물관',
        startAt: '2026-08-25T00:00:00',
        endAt: '2026-08-25T23:59:59',
        geofencePoints,
      }),
    })
  })

  it('체험학습 생성 API가 거부한 이유를 사용자 오류로 전달한다', async () => {
    // given
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: '활동 구역을 확인해 주세요.' }, false))
    vi.stubGlobal('fetch', fetchMock)

    // when
    const creation = teacherTripApi.create({
      title: '국립중앙박물관',
      date: '2026-08-25',
      place: '국립중앙박물관',
      geofencePoints: [],
    })

    // then
    await expect(creation).rejects.toThrow('활동 구역을 확인해 주세요.')
  })

  it('인증된_교사가_생성한_체험학습_목록을_조회한다', async () => {
    // given
    const fetchMock = vi.fn()
    fetchMock.mockResolvedValueOnce(jsonResponse({ success: true, data: [
      { tripId: 7, title: '26년 5학년 2반', place: '국립중앙박물관', startAt: '2026-09-12T09:00:00', status: 'ACTIVE' },
    ] }))
    vi.stubGlobal('fetch', fetchMock)

    // when
    const trips = await teacherTripApi.getTrips()

    // then
    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/trips', { credentials: 'include' })
    expect(trips).toEqual([
      { id: 7, title: '26년 5학년 2반', place: '국립중앙박물관', startAt: '2026-09-12T09:00:00', status: 'ACTIVE' },
    ])
  })

  it('체험학습_목록_조회_실패_메시지를_전달한다', async () => {
    // given
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ success: false, message: '체험학습 목록을 불러오지 못했습니다.' }, false))
    vi.stubGlobal('fetch', fetchMock)

    // when & then
    await expect(teacherTripApi.getTrips()).rejects.toThrow('체험학습 목록을 불러오지 못했습니다.')
  })
})
