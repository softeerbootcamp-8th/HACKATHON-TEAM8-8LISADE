import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { teacherTripApi } from '../../api/teacherTripApi'
import type { TeacherTrip } from '../../types/teacherTrip'
import { TeacherDashboard } from './TeacherDashboard'

vi.mock('../../api/teacherTripApi', () => ({
  teacherTripApi: { getTrips: vi.fn() },
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
})

function trip(id: number, title: string): TeacherTrip {
  return { id, title, place: '경주', startAt: '2026-08-26T09:00:00', status: 'ACTIVE' }
}
