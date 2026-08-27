import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { teacherTripApi } from '../../api/teacherTripApi'
import type { TeacherTrip } from '../../types/teacherTrip'
import { TeacherDashboard } from './TeacherDashboard'
import { foregroundNotifications } from '../../notifications/foregroundNotifications'

vi.mock('../../api/teacherTripApi', () => ({
  teacherTripApi: { getTrips: vi.fn(), start: vi.fn(), getParticipants: vi.fn(), getCurrentInviteCode: vi.fn() },
}))

vi.mock('./TeacherHomeProgress', () => ({
  TeacherHomeProgress: ({ tripId, onViewStudents }: { tripId: string; onViewStudents: () => void }) =>
    <div>진행 현황(Trip {tripId})<button type="button" onClick={onViewStudents}>학생 탭으로</button></div>,
}))

vi.mock('./TripCreationFlow', () => ({
  TripCreationFlow: ({ onCreated }: { onCreated: (code: string) => void }) =>
    <button type="button" onClick={() => onCreated('AB1234')}>테스트 생성 완료</button>,
}))

vi.mock('./TeacherLocationMap', () => ({
  TeacherLocationMap: ({ trips }: { trips: TeacherTrip[] }) =>
    <div>{trips.map((trip) => <span key={trip.id}>{trip.title}</span>)}</div>,
}))

vi.mock('../../components/TeacherMissions', () => ({ default: () => <div>미션</div> }))

vi.mock('./TeacherNotifications', () => ({
  TeacherNotifications: ({ onBack }: { onBack: () => void }) =>
    <div>알림 목록<button type="button" onClick={onBack}>알림 목록 닫기</button></div>,
}))

const user = { id: 1, loginId: 'teacher01', name: '고심', phoneNumber: '01012341234', role: 'TEACHER' as const }
const 기존체험학습 = trip(1, '기존 체험학습')
const 갱신된체험학습 = trip(2, '갱신된 체험학습')
const 최신체험학습 = trip(3, '최신 체험학습')

describe('TeacherDashboard', () => {
  beforeEach(() => {
    vi.mocked(teacherTripApi.getTrips).mockReset()
    vi.mocked(teacherTripApi.start).mockReset().mockResolvedValue({ code: 'AB1234' })
    vi.mocked(teacherTripApi.getParticipants).mockReset().mockResolvedValue([])
    vi.mocked(teacherTripApi.getCurrentInviteCode).mockReset().mockResolvedValue(null)
  })

  it('교사가_탭을_이동할_때마다_최신_체험학습_목록을_본다', async () => {
    // given
    vi.mocked(teacherTripApi.getTrips)
      .mockResolvedValueOnce([기존체험학습])
      .mockResolvedValueOnce([갱신된체험학습])
      .mockResolvedValueOnce([갱신된체험학습])
      .mockResolvedValueOnce([최신체험학습])
    render(<TeacherDashboard user={user} />)
    await waitFor(() => expect(teacherTripApi.getTrips).toHaveBeenCalledTimes(1))

    // when
    fireEvent.click(screen.getByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('heading', { name: '갱신된 체험학습' })).toBeInTheDocument()

    // when
    fireEvent.click(screen.getByRole('button', { name: '홈' }))
    fireEvent.click(screen.getByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('heading', { name: '최신 체험학습' })).toBeInTheDocument()
  })

  it('현장체험학습_생성을_마치면_관리_목록에_새_체험학습을_표시한다', async () => {
    // given
    vi.mocked(teacherTripApi.getTrips)
      .mockResolvedValueOnce([기존체험학습])
      .mockResolvedValueOnce([기존체험학습])
      .mockResolvedValueOnce([최신체험학습, 기존체험학습])
    render(<TeacherDashboard user={user} />)
    await waitFor(() => expect(teacherTripApi.getTrips).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '관리' }))
    await screen.findByRole('heading', { name: '기존 체험학습' })
    fireEvent.click(screen.getByRole('button', { name: '현장체험학습 추가하기' }))

    // when
    fireEvent.click(screen.getByRole('button', { name: '테스트 생성 완료' }))

    // then
    expect(await screen.findByRole('heading', { name: '최신 체험학습' })).toBeInTheDocument()
  })

  it('탭에서_체험학습_목록을_다시_받지_못하면_오류를_안내한다', async () => {
    // given
    vi.mocked(teacherTripApi.getTrips)
      .mockResolvedValueOnce([기존체험학습])
      .mockRejectedValueOnce(new Error('체험학습 목록을 불러오지 못했습니다.'))
    render(<TeacherDashboard user={user} />)
    await waitFor(() => expect(teacherTripApi.getTrips).toHaveBeenCalledTimes(1))

    // when
    fireEvent.click(screen.getByRole('button', { name: '관리' }))

    // then
    expect(await screen.findByRole('alert')).toHaveTextContent('체험학습 목록을 불러오지 못했습니다.')
  })

  it('Given 체험학습 목록 응답이 대기 중일 때 When 홈을 열면 Then 목록 스켈레톤을 보여준다', () => {
    // given
    vi.mocked(teacherTripApi.getTrips).mockReturnValue(new Promise(() => {}))

    // when
    render(<TeacherDashboard user={user} />)

    // then
    expect(screen.getByRole('status', { name: '체험학습 목록을 불러오는 중입니다.' })).toHaveClass('list-skeleton')
  })

  it('shows the empty state and lets the teacher start creating a trip when there are none', async () => {
    vi.mocked(teacherTripApi.getTrips).mockResolvedValue([])
    render(<TeacherDashboard user={user} />)

    expect(await screen.findByText(/아직 예정된현장체험학습이 없어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ 현장체험학습 생성하기' })).toBeInTheDocument()
  })

  it('Given 교사 화면일 때 When 포그라운드 알림이 도착하면 Then 토스트와 종 배지를 표시한다', async () => {
    vi.mocked(teacherTripApi.getTrips).mockResolvedValue([기존체험학습])
    render(<TeacherDashboard user={user} />)
    await screen.findByText('진행 현황(Trip 1)')

    act(() => foregroundNotifications.publish({ title: '안전 구역 이탈', body: '김학생이 안전 구역을 벗어났습니다.' }))

    expect(screen.getByRole('status')).toHaveTextContent('안전 구역 이탈')
    expect(screen.getByRole('button', { name: '알림 (새 알림 있음)' })).toBeInTheDocument()
  })

  it('Given 미확인 알림이 있을 때 When 종을 눌러 알림 목록을 열면 Then 배지가 해제된다', async () => {
    vi.mocked(teacherTripApi.getTrips).mockResolvedValue([기존체험학습])
    render(<TeacherDashboard user={user} />)
    await screen.findByText('진행 현황(Trip 1)')
    act(() => foregroundNotifications.publish({ title: '새 미션', body: '미션이 등록되었습니다.' }))

    fireEvent.click(screen.getByRole('button', { name: '알림 (새 알림 있음)' }))

    expect(screen.getByText('알림 목록')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '알림 목록 닫기' }))
    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '알림 (새 알림 있음)' })).not.toBeInTheDocument()
  })

  it('shows the real trip progress once an active trip exists', async () => {
    vi.mocked(teacherTripApi.getTrips).mockResolvedValue([기존체험학습])
    render(<TeacherDashboard user={user} />)

    expect(await screen.findByText('진행 현황(Trip 1)')).toBeInTheDocument()
    expect(screen.queryByText(/아직 예정된/)).not.toBeInTheDocument()
  })

  it('학생 탭 이동 버튼을 누르면 학생 탭으로 전환한다', async () => {
    vi.mocked(teacherTripApi.getTrips).mockResolvedValue([기존체험학습])
    render(<TeacherDashboard user={user} />)
    await screen.findByText('진행 현황(Trip 1)')

    fireEvent.click(screen.getByRole('button', { name: '학생 탭으로' }))

    expect(screen.getByRole('button', { name: '학생' })).toHaveAttribute('aria-pressed', 'true')
  })

  describe('예정(READY) 체험학습 홈 카드', () => {
    it('Given_진행_중인_체험학습이_없고_예정만_있을_때_When_홈을_열면_Then_다가오는_카드를_보여준다', async () => {
      // given
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([readyTrip(7, '26년 5학년 2반', 18)])

      // when
      render(<TeacherDashboard user={user} />)

      // then
      expect(await screen.findByRole('heading', { name: '다가오는 현장체험학습' })).toBeInTheDocument()
      expect(screen.getByText('26년 5학년 2반')).toBeInTheDocument()
      expect(screen.getByText('예정')).toBeInTheDocument()
      expect(screen.getByText('D-18')).toBeInTheDocument()
      expect(screen.getByText('국립중앙박물관')).toBeInTheDocument()
      expect(screen.getByText('고심 선생님')).toBeInTheDocument()
      expect(screen.queryByText(/진행 중인 현장체험학습이 없습니다/)).not.toBeInTheDocument()
    })

    it('Given_일자만_지정된_체험학습_When_홈을_열면_Then_날짜와_요일을_보여준다', async () => {
      // 체험학습 생성 화면이 일자만 받으므로 카드도 날짜까지만 보여준다.
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([{
        ...readyTrip(7, '26년 5학년 2반', 18),
        startAt: '2026-09-12T00:00:00',
      }])

      render(<TeacherDashboard user={user} />)

      expect(await screen.findByText('2026. 09. 12 (토)')).toBeInTheDocument()
    })

    it('Given_당일_시작하는_체험학습_When_홈을_열면_Then_D-DAY로_표시한다', async () => {
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([readyTrip(7, '오늘 체험학습', 0)])

      render(<TeacherDashboard user={user} />)

      expect(await screen.findByText('D-DAY')).toBeInTheDocument()
    })

    it('Given_예정_체험학습이_여러_개일_때_When_홈을_열면_Then_날짜가_빠른_순서로_보여준다', async () => {
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([
        readyTrip(8, '나중 체험학습', 30),
        readyTrip(9, '먼저 체험학습', 3),
      ])

      render(<TeacherDashboard user={user} />)

      const titles = (await screen.findAllByRole('heading', { level: 3 })).map((heading) => heading.textContent)
      expect(titles).toEqual(['먼저 체험학습', '나중 체험학습'])
    })

    it('Given_다가오는_카드_When_시작하기를_누르면_Then_start를_호출하고_진행_중_홈으로_바뀐다', async () => {
      // given
      vi.mocked(teacherTripApi.getTrips)
        .mockResolvedValueOnce([readyTrip(7, '26년 5학년 2반', 18)])
        .mockResolvedValue([trip(7, '26년 5학년 2반')])
      render(<TeacherDashboard user={user} />)
      await screen.findByRole('heading', { name: '다가오는 현장체험학습' })

      // when
      fireEvent.click(screen.getByRole('button', { name: '시작하기' }))

      // then
      await waitFor(() => expect(teacherTripApi.start).toHaveBeenCalledWith(7))
      expect(await screen.findByText('진행 현황(Trip 7)')).toBeInTheDocument()
    })

    it('Given_다가오는_카드_When_시작에_실패하면_Then_실패_사유를_보여주고_카드를_유지한다', async () => {
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([readyTrip(7, '26년 5학년 2반', 18)])
      vi.mocked(teacherTripApi.start).mockRejectedValue(new Error('이미 진행 중인 체험학습이 있습니다.'))
      render(<TeacherDashboard user={user} />)
      await screen.findByRole('heading', { name: '다가오는 현장체험학습' })

      fireEvent.click(screen.getByRole('button', { name: '시작하기' }))

      expect(await screen.findByText('이미 진행 중인 체험학습이 있습니다.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '시작하기' })).toBeInTheDocument()
    })

    it('Given_다가오는_카드_When_카드를_누르면_Then_관리_상세로_이동한다', async () => {
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([readyTrip(7, '26년 5학년 2반', 18)])
      render(<TeacherDashboard user={user} />)
      await screen.findByRole('heading', { name: '다가오는 현장체험학습' })

      fireEvent.click(screen.getByRole('button', { name: '26년 5학년 2반 상세 보기' }))

      expect(await screen.findByRole('heading', { name: '26년 5학년 2반' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '관리 화면으로 돌아가기' })).toBeInTheDocument()
    })

    it('Given_진행_중인_체험학습이_있을_때_When_홈을_열면_Then_다가오는_카드_대신_진행_현황을_보여준다', async () => {
      vi.mocked(teacherTripApi.getTrips).mockResolvedValue([기존체험학습, readyTrip(7, '26년 5학년 2반', 18)])

      render(<TeacherDashboard user={user} />)

      expect(await screen.findByText('진행 현황(Trip 1)')).toBeInTheDocument()
      expect(screen.queryByRole('heading', { name: '다가오는 현장체험학습' })).not.toBeInTheDocument()
    })
  })
})

function trip(id: number, title: string): TeacherTrip {
  return { id, title, place: '경주', startAt: '2026-08-26T09:00:00', status: 'ACTIVE' }
}

// D-day는 오늘 기준으로 계산되므로 고정 날짜 대신 상대 날짜로 만든다.
function readyTrip(id: number, title: string, daysFromToday: number, place = '국립중앙박물관'): TeacherTrip {
  const startAt = new Date()
  startAt.setHours(9, 0, 0, 0)
  startAt.setDate(startAt.getDate() + daysFromToday)
  const pad = (value: number) => String(value).padStart(2, '0')
  return {
    id,
    title,
    place,
    startAt: `${startAt.getFullYear()}-${pad(startAt.getMonth() + 1)}-${pad(startAt.getDate())}T09:00:00`,
    status: 'READY',
  }
}
