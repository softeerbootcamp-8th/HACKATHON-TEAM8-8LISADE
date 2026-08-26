import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TeacherHomeProgress } from './TeacherHomeProgress'
import { teacherStudentApi } from '../../api/teacherStudentApi'
import { teacherMissionApi } from '../../api/missionApi'
import { teacherTripApi } from '../../api/teacherTripApi'

vi.mock('../../api/teacherStudentApi', () => ({
  teacherStudentApi: { listStudents: vi.fn(), getStudentDetail: vi.fn() },
}))
vi.mock('../../api/missionApi', () => ({
  teacherMissionApi: { listMissions: vi.fn(), getStatusBoard: vi.fn() },
}))
vi.mock('../../api/teacherTripApi', () => ({
  teacherTripApi: { end: vi.fn() },
}))

const roster = [
  { participantId: 1, userId: 11, name: '김하늘', type: 'APP' as const, outside: true, lastSentAt: new Date().toISOString(), joinedAt: new Date().toISOString() },
  { participantId: 2, userId: 12, name: '박서준', type: 'APP' as const, outside: false, lastSentAt: new Date().toISOString(), joinedAt: new Date().toISOString() },
  { participantId: 3, userId: 13, name: '이도윤', type: 'APP' as const, outside: false, lastSentAt: new Date().toISOString(), joinedAt: new Date().toISOString() },
]

const mission = { id: 1, tripId: '7', title: '사진 미션', description: '', type: 'ACTIVITY' as const, startAt: null, endAt: null, pin: null }

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
    vi.mocked(teacherTripApi.end).mockReset().mockResolvedValue(undefined)
  })

  it('이탈·미완료 학생을 확인이 필요한 학생 목록으로 보여준다', async () => {
    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} onFinished={vi.fn()} />)

    expect(await screen.findByText('확인이 필요한 학생 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /김하늘.*이탈/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /박서준.*미완료/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이도윤.*미완료/ })).toBeInTheDocument()
  })

  it('확인이 필요한 학생이 없으면 안내 문구를 보여준다', async () => {
    vi.mocked(teacherStudentApi.listStudents).mockResolvedValue([{ ...roster[0], outside: false }])
    vi.mocked(teacherMissionApi.getStatusBoard).mockResolvedValue({ mission, totalStudentCount: 1, submitted: [], notSubmitted: [] })

    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} onFinished={vi.fn()} />)

    expect(await screen.findByText('확인이 필요한 학생이 없습니다.')).toBeInTheDocument()
  })

  it('학생 항목을 누르면 학생 탭으로 이동한다', async () => {
    const onViewStudents = vi.fn()
    render(<TeacherHomeProgress tripId="7" onViewStudents={onViewStudents} onFinished={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: /김하늘/ }))

    expect(onViewStudents).toHaveBeenCalled()
  })

  it('종료 버튼을 두 번째 확인까지 누르면 teacherTripApi.end를 호출한다', async () => {
    const onFinished = vi.fn()
    render(<TeacherHomeProgress tripId="7" onViewStudents={vi.fn()} onFinished={onFinished} />)
    await screen.findByText('확인이 필요한 학생 3')

    fireEvent.click(screen.getByRole('button', { name: '현장체험학습 종료' }))
    fireEvent.click(screen.getByRole('button', { name: '종료하기' }))

    await waitFor(() => expect(teacherTripApi.end).toHaveBeenCalledWith(7))
    await waitFor(() => expect(onFinished).toHaveBeenCalled())
  })
})
