import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TeacherHomeProgress } from './TeacherHomeProgress'
import { teacherStudentApi } from '../../api/teacherStudentApi'
import { teacherMissionApi } from '../../api/missionApi'

vi.mock('../../api/teacherStudentApi', () => ({
  teacherStudentApi: { listStudents: vi.fn(), getStudentDetail: vi.fn() },
}))
vi.mock('../../api/missionApi', () => ({
  teacherMissionApi: { listMissions: vi.fn(), getStatusBoard: vi.fn() },
}))

const roster = [
  { participantId: 1, userId: 11, name: '김하늘', type: 'APP' as const, outside: true, lastSentAt: new Date().toISOString(), joinedAt: new Date().toISOString() },
  { participantId: 2, userId: 12, name: '박서준', type: 'APP' as const, outside: false, lastSentAt: new Date().toISOString(), joinedAt: new Date().toISOString() },
  { participantId: 3, userId: 13, name: '이도윤', type: 'APP' as const, outside: false, lastSentAt: new Date().toISOString(), joinedAt: new Date().toISOString() },
]

const mission = { id: 1, tripId: '7', title: '사진 미션', description: '', type: 'ACTIVITY' as const, startAt: null, endAt: null, pin: null, completedAt: null }

describe('TeacherHomeProgress', () => {
  beforeEach(() => {
    vi.mocked(teacherStudentApi.listStudents).mockReset().mockResolvedValue(roster)
    vi.mocked(teacherMissionApi.listMissions).mockReset().mockResolvedValue([mission])
    vi.mocked(teacherMissionApi.getStatusBoard).mockReset().mockResolvedValue({
      mission,
      totalStudentCount: 3,
      submitted: [],
      notSubmitted: [{ studentId: 12, studentName: '박서준', rejectionReason: null }, { studentId: 13, studentName: '이도윤', rejectionReason: null }],
    })
  })

  afterEach(() => vi.useRealTimers())

  it('Given 학생 목록 응답이 대기 중일 때 When 홈 현황을 열면 Then 목록 스켈레톤을 보여준다', () => {
    // given
    vi.mocked(teacherStudentApi.listStudents).mockReturnValue(new Promise(() => {}))

    // when
    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} />)

    // then
    expect(screen.getByRole('status', { name: '확인이 필요한 학생 목록을 불러오는 중입니다.' })).toHaveClass('list-skeleton')
  })

  it('Given_정상이던_학생_When_일초_뒤_이탈하면_Then_확인_필요_목록에_반영한다', async () => {
    // given
    vi.useFakeTimers()
    vi.mocked(teacherStudentApi.listStudents)
      .mockResolvedValueOnce(roster.map((student) => ({ ...student, outside: false })))
      .mockResolvedValue(roster)
    vi.mocked(teacherMissionApi.getStatusBoard).mockResolvedValue({ mission, totalStudentCount: 3, submitted: [], notSubmitted: [] })
    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(screen.queryByRole('button', { name: /김하늘.*이탈/ })).not.toBeInTheDocument()

    // when
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })

    // then
    expect(screen.getByRole('button', { name: /김하늘.*이탈/ })).toBeInTheDocument()
  })

  it('이탈·미완료 학생을 확인이 필요한 학생 목록으로 보여준다', async () => {
    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} />)

    expect(await screen.findByText('확인이 필요한 학생 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /김하늘.*이탈/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /박서준.*미완료/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이도윤.*미완료/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /김하늘.*이탈/ })).toHaveClass('teacher-home-attention-row')
  })

  it('위치·미션 사유를 동시에 가진 학생은 태그 두 개를 함께 보여준다', async () => {
    vi.mocked(teacherMissionApi.getStatusBoard).mockResolvedValue({
      mission,
      totalStudentCount: 3,
      submitted: [],
      notSubmitted: [{ studentId: 11, studentName: '김하늘', rejectionReason: null }],
    })

    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} />)

    expect(await screen.findByRole('button', { name: /김하늘.*이탈.*미완료/ })).toBeInTheDocument()
  })

  it('확인이 필요한 학생이 없으면 안내 문구를 보여준다', async () => {
    vi.mocked(teacherStudentApi.listStudents).mockResolvedValue([{ ...roster[0], outside: false }])
    vi.mocked(teacherMissionApi.getStatusBoard).mockResolvedValue({ mission, totalStudentCount: 1, submitted: [], notSubmitted: [] })

    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} />)

    expect(await screen.findByText('확인이 필요한 학생이 없습니다.')).toBeInTheDocument()
  })

  it('학생 항목을 누르면 학생 탭으로 이동한다', async () => {
    const onViewStudents = vi.fn()
    render(<TeacherHomeProgress tripId="7" onViewStudents={onViewStudents} />)

    fireEvent.click(await screen.findByRole('button', { name: /김하늘/ }))

    expect(onViewStudents).toHaveBeenCalled()
  })

  it('홈 화면에는 현장체험학습 종료 버튼을 노출하지 않는다', async () => {
    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} />)
    await screen.findByText('확인이 필요한 학생 3')

    expect(screen.queryByRole('button', { name: '현장체험학습 종료' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '종료하기' })).not.toBeInTheDocument()
  })
})
