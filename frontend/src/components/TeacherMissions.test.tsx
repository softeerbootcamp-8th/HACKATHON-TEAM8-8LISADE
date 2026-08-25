import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetMockTeacherMissionStore } from '../api/missionApi'
import TeacherMissions from './TeacherMissions'

Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

describe('TeacherMissions', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    resetMockTeacherMissionStore()
  })

  it('lists the seeded missions for a Trip', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    expect(await screen.findByText('전통 문화 사진 미션 · 활동 미션')).toBeInTheDocument()
    expect(screen.getByText('경복궁 출석 체크 · 점검 미션')).toBeInTheDocument()
  })

  it('reveals and copies the PIN for a check mission', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: 'PIN 확인' }))
    expect(screen.getByText('PIN:')).toBeInTheDocument()
    expect(screen.getByText('1234')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '복사' }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1234')
    expect(await screen.findByRole('button', { name: '복사됨' })).toBeInTheDocument()
  })

  it('requires a scheduled dispatch time before creating a mission', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: '새 미션 등록' }))
    fireEvent.change(screen.getByLabelText('미션 제목'), { target: { value: '박물관 사진 미션' } })
    fireEvent.click(screen.getByRole('radio', { name: '예약 발송' }))
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('예약 발송 시각을 입력해 주세요.')
  })

  it('creates a check mission and shows the issued PIN in a notice', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: '새 미션 등록' }))
    fireEvent.change(screen.getByLabelText('미션 제목'), { target: { value: '두 번째 출석 체크' } })
    fireEvent.click(screen.getByRole('radio', { name: '점검 미션' }))
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('점검 미션이 등록되었습니다. PIN:')
    expect(screen.getByText('두 번째 출석 체크 · 점검 미션')).toBeInTheDocument()
  })

  it('rejects a completed submission with a reason', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click((await screen.findAllByRole('button', { name: '제출함 보기' }))[0])
    fireEvent.click(await screen.findByRole('button', { name: '반려하기' }))
    fireEvent.change(screen.getByLabelText('반려 사유'), { target: { value: '사진이 흐릿합니다.' } })
    fireEvent.click(screen.getByRole('button', { name: '반려 확정' }))

    expect(await screen.findByText('김학생 · 반려')).toBeInTheDocument()
    expect(screen.getByText('반려 사유: 사진이 흐릿합니다.')).toBeInTheDocument()
  })

  it('shows the student-by-mission progress board', async () => {
    render(<TeacherMissions tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: '학생별 현황판 보기' }))

    expect(await screen.findByRole('columnheader', { name: '전통 문화 사진 미션' })).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /김학생/ })).toBeInTheDocument()
  })
})
