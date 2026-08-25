import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import TeacherStudents from './TeacherStudents'

describe('TeacherStudents', () => {
  it('splits the roster into students needing attention and the full list', async () => {
    render(<TeacherStudents tripId="trip-1" />)

    expect(await screen.findByText('확인이 필요한 학생 2')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /김하늘/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /박서준/ })).toBeInTheDocument()
    expect(screen.getByText('전체 학생 5')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이서연/ })).toBeInTheDocument()
  })

  it('shows an empty trip with no students', async () => {
    render(<TeacherStudents tripId="trip-2" />)

    expect(await screen.findByText('전체 학생 0')).toBeInTheDocument()
    expect(screen.getByText('확인이 필요한 학생이 없습니다.')).toBeInTheDocument()
  })

  it('opens a student detail with phone numbers, location and mission status', async () => {
    render(<TeacherStudents tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))

    expect(await screen.findByRole('button', { name: /‹ 이서연/ })).toBeInTheDocument()
    expect(screen.getByText('010-1234-5603')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '전화 걸기' })[0]).toHaveAttribute('href', 'tel:010-1234-5603')
    expect(screen.getByText('현재 위치')).toBeInTheDocument()
    expect(screen.getByText('첨성대 앞에서 사진 찍기')).toBeInTheDocument()
  })

  it('labels a student with no location as needing a check', async () => {
    render(<TeacherStudents tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /박서준/ }))

    expect(await screen.findAllByText('위치 확인 필요')).not.toHaveLength(0)
  })

  it('returns to the list from the detail screen', async () => {
    render(<TeacherStudents tripId="trip-1" />)

    fireEvent.click(await screen.findByRole('button', { name: /이서연/ }))
    fireEvent.click(await screen.findByRole('button', { name: /‹ 이서연/ }))

    expect(await screen.findByText('전체 학생 5')).toBeInTheDocument()
  })
})
