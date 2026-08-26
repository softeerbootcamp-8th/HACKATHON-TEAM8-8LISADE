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
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { tripId: 1 } }))
    vi.stubGlobal('fetch', fetchMock)
    const geofencePoints = [
      { latitude: 37.523, longitude: 126.98 },
      { latitude: 37.524, longitude: 126.981 },
      { latitude: 37.522, longitude: 126.982 },
    ]

    // when
    const created = await teacherTripApi.create({ title: '국립중앙박물관', date: '2026-08-25', place: '국립중앙박물관', geofencePoints })

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
    expect(created).toEqual({ tripId: 1 })
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

  it('체험학습의_참여_학생_목록을_조회한다', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ success: true, data: [
      { id: 3, userId: null, name: '현장 확인 학생', type: 'MANUAL', createdAt: '2026-08-25T09:00:00' },
    ] }))
    vi.stubGlobal('fetch', fetchMock)

    const participants = await teacherTripApi.getParticipants(1)

    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/trips/1/participants', { credentials: 'include' })
    expect(participants).toEqual([{ id: 3, userId: null, name: '현장 확인 학생', type: 'MANUAL', createdAt: '2026-08-25T09:00:00' }])
  })

  it('앱을_쓰지_않는_학생을_이름으로_직접_추가한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 3, userId: null, name: '현장 확인 학생', type: 'MANUAL', createdAt: '2026-08-25T09:00:00' } }))
    vi.stubGlobal('fetch', fetchMock)

    const participant = await teacherTripApi.addManualParticipant(1, '현장 확인 학생')

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/teacher/trips/1/participants/manual', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({ name: '현장 확인 학생' }),
    })
    expect(participant.name).toBe('현장 확인 학생')
  })

  it('현재_유효한_초대코드가_없으면_null을_반환한다', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    vi.stubGlobal('fetch', fetchMock)

    const inviteCode = await teacherTripApi.getCurrentInviteCode(1)

    expect(fetchMock).toHaveBeenCalledWith('/api/teacher/trips/1/invite-code', { credentials: 'include' })
    expect(inviteCode).toBeNull()
  })

  it('체험학습을_종료한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    vi.stubGlobal('fetch', fetchMock)

    await teacherTripApi.end(1)

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/teacher/trips/1/end', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({}),
    })
  })

  it('예정된_체험학습을_시작하면_새_초대코드를_받는다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { code: 'EF9012' } }))
    vi.stubGlobal('fetch', fetchMock)

    const inviteCode = await teacherTripApi.start(1)

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/teacher/trips/1/start', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
    })
    expect(inviteCode.code).toBe('EF9012')
  })

  it('예정된_체험학습을_삭제한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { token: 'csrf-token', headerName: 'X-CSRF-TOKEN' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: null }))
    vi.stubGlobal('fetch', fetchMock)

    await teacherTripApi.delete(1)

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/teacher/trips/1', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-token' },
      body: JSON.stringify({}),
    })
  })
})
