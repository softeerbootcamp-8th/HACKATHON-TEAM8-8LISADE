import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TeacherMission } from '../../types/mission'
import type { TeacherTrip } from '../../types/teacherTrip'

vi.mock('../../api/teacherTripApi', () => ({
  teacherTripApi: {
    getParticipants: vi.fn(),
    getCurrentInviteCode: vi.fn(),
    end: vi.fn(),
    start: vi.fn(),
    delete: vi.fn(),
    addManualParticipant: vi.fn(),
  },
}))

vi.mock('../../api/missionApi', () => ({
  teacherMissionApi: {
    listMissions: vi.fn(),
  },
}))

import { teacherMissionApi } from '../../api/missionApi'
import { teacherTripApi } from '../../api/teacherTripApi'
import { AddStudentForm, TripDetail } from './TripDetail'

const activeTrip: TeacherTrip = { id: 1, title: '경복궁 현장체험학습', place: '경복궁', startAt: '2026-09-12T09:00:00', status: 'ACTIVE' }
const finishedTrip: TeacherTrip = { id: 2, title: '지난 체험학습', place: '국립중앙박물관', startAt: '2026-07-01T09:00:00', status: 'FINISHED' }
const readyTrip: TeacherTrip = { id: 3, title: '예정된 체험학습', place: '경주', startAt: '2026-10-02T09:00:00', status: 'READY' }
const finishedMissions: TeacherMission[] = [
  { id: 1, tripId: '2', title: '불국사에서 사진 찍기', description: '', type: 'ACTIVITY', startAt: null, endAt: null, pin: null },
  { id: 2, tripId: '2', title: '석굴암에서 출석 인증하기', description: '', type: 'CHECK', startAt: null, endAt: null, pin: '1234' },
]

describe('TripDetail', () => {
  beforeEach(() => {
    vi.mocked(teacherTripApi.getParticipants).mockReset().mockResolvedValue([])
    vi.mocked(teacherTripApi.getCurrentInviteCode).mockReset().mockResolvedValue({ code: 'AB1234' })
    vi.mocked(teacherTripApi.end).mockReset()
    vi.mocked(teacherTripApi.start).mockReset()
    vi.mocked(teacherTripApi.delete).mockReset()
    vi.mocked(teacherMissionApi.listMissions).mockReset().mockResolvedValue([])
  })

  it('예정 상태 체험학습은 초대 코드 대신 시작하기·삭제하기 버튼을 보여준다', async () => {
    render(<TripDetail trip={readyTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)

    expect(await screen.findByText('0명')).toBeInTheDocument()
    expect(screen.queryByText('학생 초대')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '현장체험학습 시작' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument()
    expect(teacherTripApi.getCurrentInviteCode).not.toHaveBeenCalled()
  })

  it('시작하기를 누르면 시작을 요청하고 onStarted를 호출한다', async () => {
    const onStarted = vi.fn()
    vi.mocked(teacherTripApi.start).mockResolvedValue({ code: 'EF9012' })
    render(<TripDetail trip={readyTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={onStarted} onDeleted={vi.fn()} onFinished={vi.fn()} />)
    await screen.findByRole('button', { name: '현장체험학습 시작' })

    fireEvent.click(screen.getByRole('button', { name: '현장체험학습 시작' }))

    expect(teacherTripApi.start).toHaveBeenCalledWith(3)
    await waitFor(() => expect(onStarted).toHaveBeenCalled())
  })

  it('삭제하기는 확인 단계를 거친 뒤에만 삭제를 요청하고 onDeleted를 호출한다', async () => {
    const onDeleted = vi.fn()
    vi.mocked(teacherTripApi.delete).mockResolvedValue(undefined)
    render(<TripDetail trip={readyTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={onDeleted} onFinished={vi.fn()} />)
    await screen.findByRole('button', { name: '삭제하기' })

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }))
    expect(teacherTripApi.delete).not.toHaveBeenCalled()
    expect(screen.getByText('정말 삭제할까요? 삭제 후에는 되돌릴 수 없어요.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }))

    await waitFor(() => expect(teacherTripApi.delete).toHaveBeenCalledWith(3))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('삭제 확인에서 취소를 누르면 삭제를 요청하지 않는다', async () => {
    render(<TripDetail trip={readyTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)
    await screen.findByRole('button', { name: '삭제하기' })

    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.getByRole('button', { name: '삭제하기' })).toBeInTheDocument()
    expect(teacherTripApi.delete).not.toHaveBeenCalled()
  })

  it('진행 중인 체험학습의 일정·장소·담당자·참여 학생 수와 초대 코드를 보여준다', async () => {
    vi.mocked(teacherTripApi.getParticipants).mockResolvedValue([
      { id: 1, userId: 20, name: '김학생', type: 'APP', createdAt: '2026-08-25T09:00:00' },
    ])

    render(<TripDetail trip={activeTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)

    expect(await screen.findByText('AB1234')).toBeInTheDocument()
    expect(await screen.findByText('1명')).toBeInTheDocument()
    expect(screen.getByText('경복궁')).toBeInTheDocument()
    expect(screen.getByText('고심 선생님')).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '코드 재발급' })).not.toBeInTheDocument()
  })

  it('일정에 시간 없이 날짜와 요일만 보여준다(시간 입력을 받지 않으므로)', async () => {
    render(<TripDetail trip={activeTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)

    expect(await screen.findByText('2026. 09. 12 (토)')).toBeInTheDocument()
    expect(screen.queryByText(/\d{2}:\d{2}/)).not.toBeInTheDocument()
  })

  it('종료된 체험학습은 초대 코드와 종료 버튼을 보여주지 않는다', async () => {
    render(<TripDetail trip={finishedTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)

    expect(await screen.findByText('종료')).toBeInTheDocument()
    expect(screen.queryByText('참여 학생')).not.toBeInTheDocument()
    expect(screen.queryByText('학생 초대')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '현장체험학습 종료' })).not.toBeInTheDocument()
    expect(teacherTripApi.getCurrentInviteCode).not.toHaveBeenCalled()
  })

  it('종료된 체험학습은 수행한 미션 수와 목록을 보여준다', async () => {
    // given
    vi.mocked(teacherMissionApi.listMissions).mockResolvedValue(finishedMissions)

    // when
    render(<TripDetail trip={finishedTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)

    // then
    expect(await screen.findByRole('heading', { name: '수행한 미션 2개' })).toBeInTheDocument()
    expect(screen.getByText('미션1 · 불국사에서 사진 찍기')).toBeInTheDocument()
    expect(screen.getByText('미션2 · 석굴암에서 출석 인증하기')).toBeInTheDocument()
    expect(teacherMissionApi.listMissions).toHaveBeenCalledWith('2')
  })

  it('종료된 체험학습의 삭제하기는 확인 후 삭제를 요청한다', async () => {
    // given
    const onDeleted = vi.fn()
    vi.mocked(teacherTripApi.delete).mockResolvedValue(undefined)
    render(<TripDetail trip={finishedTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={onDeleted} onFinished={vi.fn()} />)

    // when
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }))
    fireEvent.click(screen.getByRole('button', { name: '삭제하기' }))

    // then
    await waitFor(() => expect(teacherTripApi.delete).toHaveBeenCalledWith(2))
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('종료된 체험학습의 미션 항목은 탭 동작을 제공하지 않는다', async () => {
    // given
    vi.mocked(teacherMissionApi.listMissions).mockResolvedValue(finishedMissions)

    // when
    render(<TripDetail trip={finishedTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)
    await screen.findByText('미션1 · 불국사에서 사진 찍기')

    // then
    expect(screen.queryByRole('button', { name: /미션1/ })).not.toBeInTheDocument()
  })

  it('종료된 체험학습은 자료 내보내기를 제공하지 않는다', async () => {
    // given
    vi.mocked(teacherMissionApi.listMissions).mockResolvedValue(finishedMissions)

    // when
    render(<TripDetail trip={finishedTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)
    await screen.findByText('미션1 · 불국사에서 사진 찍기')

    // then
    expect(screen.queryByRole('button', { name: '자료 내보내기' })).not.toBeInTheDocument()
  })

  it('종료된 체험학습의 미션 목록을 불러오지 못하면 오류를 보여준다', async () => {
    // given
    vi.mocked(teacherMissionApi.listMissions).mockRejectedValue(new Error('미션 목록을 불러오지 못했습니다.'))

    // when
    render(<TripDetail trip={finishedTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)

    // then
    expect(await screen.findByRole('alert')).toHaveTextContent('미션 목록을 불러오지 못했습니다.')
  })

  it('학생 직접 추가하기를 누르면 콜백을 호출한다', async () => {
    const onAddStudent = vi.fn()
    render(<TripDetail trip={activeTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={onAddStudent} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)
    await screen.findByText('AB1234')

    fireEvent.click(screen.getByRole('button', { name: /학생 직접 추가하기/ }))

    expect(onAddStudent).toHaveBeenCalled()
  })

  it('종료 버튼은 확인 단계를 거친 뒤에만 종료를 요청한다', async () => {
    const onFinished = vi.fn()
    vi.mocked(teacherTripApi.end).mockResolvedValue(undefined)
    render(<TripDetail trip={activeTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={onFinished} />)
    await screen.findByText('AB1234')

    fireEvent.click(screen.getByRole('button', { name: '현장체험학습 종료' }))
    expect(teacherTripApi.end).not.toHaveBeenCalled()
    expect(screen.getByText('정말 종료할까요? 종료 후에는 되돌릴 수 없어요.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '종료하기' }))

    expect(teacherTripApi.end).toHaveBeenCalledWith(1)
    await waitFor(() => expect(onFinished).toHaveBeenCalled())
  })

  it('종료 확인에서 취소를 누르면 요청하지 않는다', async () => {
    render(<TripDetail trip={activeTrip} teacherName="고심" onBack={vi.fn()} onAddStudent={vi.fn()} onStarted={vi.fn()} onDeleted={vi.fn()} onFinished={vi.fn()} />)
    await screen.findByText('AB1234')

    fireEvent.click(screen.getByRole('button', { name: '현장체험학습 종료' }))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.getByRole('button', { name: '현장체험학습 종료' })).toBeInTheDocument()
    expect(teacherTripApi.end).not.toHaveBeenCalled()
  })
})

describe('AddStudentForm', () => {
  it('이름을 입력해 제출하면 onAdd를 호출한다', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined)
    render(<AddStudentForm onCancel={vi.fn()} onAdd={onAdd} />)

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))

    expect(onAdd).toHaveBeenCalledWith('홍길동')
  })

  it('추가에 실패하면 오류를 보여준다', async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error('이름을 확인해 주세요.'))
    render(<AddStudentForm onCancel={vi.fn()} onAdd={onAdd} />)

    fireEvent.change(screen.getByLabelText('이름'), { target: { value: '홍길동' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('이름을 확인해 주세요.')
  })

  it('취소 버튼을 누르면 onCancel을 호출한다', () => {
    const onCancel = vi.fn()
    render(<AddStudentForm onCancel={onCancel} onAdd={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '이전 화면으로 돌아가기' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
