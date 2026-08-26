import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { teacherTripApi } from '../../api/teacherTripApi'
import type { TeacherTrip } from '../../types/teacherTrip'
import { TeacherDashboard } from './TeacherDashboard'
import { foregroundNotifications } from '../../notifications/foregroundNotifications'

vi.mock('../../api/teacherTripApi', () => ({
  teacherTripApi: { getTrips: vi.fn() },
}))

vi.mock('./TeacherHomeProgress', () => ({
  TeacherHomeProgress: ({ tripId, onViewStudents, onFinished }: { tripId: string; onViewStudents: () => void; onFinished: () => void }) =>
    <div>진행 현황(Trip {tripId})<button type="button" onClick={onViewStudents}>학생 탭으로</button><button type="button" onClick={onFinished}>테스트 종료 완료</button></div>,
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

  it('shows a loading state on the home tab while the trip list is being fetched', () => {
    vi.mocked(teacherTripApi.getTrips).mockReturnValue(new Promise(() => {}))
    render(<TeacherDashboard user={user} />)

    expect(screen.getByRole('status')).toHaveTextContent('체험학습 목록을 불러오는 중입니다.')
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

  it('체험학습 종료가 완료되면 안내 문구와 갱신된 목록을 반영한다', async () => {
    vi.mocked(teacherTripApi.getTrips)
      .mockResolvedValueOnce([기존체험학습])
      .mockResolvedValueOnce([])
    render(<TeacherDashboard user={user} />)
    await screen.findByText('진행 현황(Trip 1)')

    fireEvent.click(screen.getByRole('button', { name: '테스트 종료 완료' }))

    expect(await screen.findByText('현장체험학습을 종료했습니다.')).toBeInTheDocument()
  })
})

function trip(id: number, title: string): TeacherTrip {
  return { id, title, place: '경주', startAt: '2026-08-26T09:00:00', status: 'ACTIVE' }
}
