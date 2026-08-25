import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockTeacherMissionStore } from '../api/missionApi'
import TeacherMissions from './TeacherMissions'

describe('TeacherMissions', () => {
  beforeEach(() => { resetMockTeacherMissionStore() })

  it('lists the seeded missions with type/status badges and progress', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    expect(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ })).toBeInTheDocument()
    expect(screen.getByText('2/5명 완료')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /15시 출발 버스 출석체크/ })).toBeInTheDocument()
    expect(screen.getByText('0/5명 완료')).toBeInTheDocument()
  })

  it('creates an activity mission and shows the end-time field only for activity missions', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: '+ 미션 추가하기' }))
    expect(screen.getByLabelText('미션 마감 시간')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '출석 체크' }))
    expect(screen.queryByLabelText('미션 마감 시간')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '불국사 앞 출석체크' } })
    fireEvent.click(screen.getByRole('button', { name: '추가하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('출석체크 미션이 등록되었습니다. 출석 코드:')
    expect(screen.getByRole('button', { name: /불국사 앞 출석체크/ })).toBeInTheDocument()
  })

  it('opens a mission status board from its card and shows submitted photos with a reject action', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /첨성대 앞에서 사진 찍기/ }))

    expect(await screen.findByRole('button', { name: /‹ 첨성대 앞에서 사진 찍기/ })).toBeInTheDocument()
    expect(screen.getByText('제출한 학생 2')).toBeInTheDocument()
    expect(screen.getByText('제출하지 않은 학생 3')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '반려' })[0])
    fireEvent.change(screen.getByLabelText('반려 사유'), { target: { value: '사진이 흐릿합니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }))

    expect(await screen.findByText('제출한 학생 1')).toBeInTheDocument()
    expect(screen.getByText('제출하지 않은 학생 4')).toBeInTheDocument()
  })

  it('lets the teacher complete an attendance mission on behalf of a student without the app', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /15시 출발 버스 출석체크/ }))

    expect(await screen.findByText('출석 코드')).toBeInTheDocument()
    expect(screen.getByText('3423')).toBeInTheDocument()
    expect(screen.getByText('출석하지 않은 학생 5')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: '대리 완료' })[0])

    expect(await screen.findByText('출석한 학생 1')).toBeInTheDocument()
    expect(screen.getByText('출석하지 않은 학생 4')).toBeInTheDocument()
  })

  it('deletes a mission after confirmation and returns to the list', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /15시 출발 버스 출석체크/ }))
    fireEvent.click(await screen.findByRole('button', { name: '삭제하기' }))
    fireEvent.click(screen.getByRole('button', { name: '삭제 확정' }))

    expect(await screen.findByRole('heading', { name: '미션 리스트' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /15시 출발 버스 출석체크/ })).not.toBeInTheDocument()
  })
})
