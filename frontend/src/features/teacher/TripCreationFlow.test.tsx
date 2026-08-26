import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GeoPoint } from '../../types/teacherTrip'

vi.mock('../../api/teacherTripApi', () => ({
  teacherTripApi: { create: vi.fn() },
}))

vi.mock('./geofenceBuffer', () => ({
  bufferGeofence: vi.fn(async (points: GeoPoint[]) => points.map((point) => ({
    latitude: Number((point.latitude + 0.001).toFixed(3)),
    longitude: Number((point.longitude + 0.001).toFixed(3)),
  }))),
}))

vi.mock('./KakaoGeofenceMap', () => ({
  KakaoGeofenceMap: ({ points, onPointAdd, onUndo }: {
    points: GeoPoint[]
    onPointAdd: (point: GeoPoint) => void
    onUndo: () => void
  }) => <section aria-label="테스트 지도">
    <p>꼭짓점 {points.length}개</p>
    <button onClick={() => onPointAdd({ latitude: 37.523, longitude: 126.98 })}>첫 점 추가</button>
    <button onClick={() => onPointAdd({ latitude: 37.524, longitude: 126.981 })}>둘째 점 추가</button>
    <button onClick={() => onPointAdd({ latitude: 37.522, longitude: 126.982 })}>셋째 점 추가</button>
    <button onClick={onUndo}>최근 꼭짓점 제거</button>
  </section>,
}))

import { teacherTripApi } from '../../api/teacherTripApi'
import { TripCreationFlow } from './TripCreationFlow'

describe('TripCreationFlow', () => {
  beforeEach(() => vi.mocked(teacherTripApi.create).mockReset())

  it('기본 정보를 입력하고 다음을 누르면 활동 구역 지정 화면으로 이동한다', () => {
    // given
    render(<TripCreationFlow onCancel={vi.fn()} onCreated={vi.fn()} />)
    fillDetails()

    // when
    fireEvent.click(screen.getByRole('button', { name: '다음' }))

    // then
    expect(screen.getByRole('heading', { name: '활동 구역을 지정해 주세요' })).toBeInTheDocument()
    expect(screen.getByLabelText('테스트 지도')).toBeInTheDocument()
  })

  it('가장 최근 꼭짓점을 제거하면 세 점이 될 때까지 생성할 수 없다', () => {
    // given
    openGeofenceStep()
    addThreePoints()
    expect(screen.getByRole('button', { name: '생성하기' })).toBeEnabled()

    // when
    fireEvent.click(screen.getByRole('button', { name: '최근 꼭짓점 제거' }))

    // then
    expect(screen.getByText('꼭짓점 2개')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '생성하기' })).toBeDisabled()
  })

  it('생성하면 20m 버퍼 좌표와 앞 단계 정보를 API로 전달한다', async () => {
    // given
    vi.mocked(teacherTripApi.create).mockResolvedValue({ tripId: 1 })
    const onCreated = vi.fn()
    render(<TripCreationFlow onCancel={vi.fn()} onCreated={onCreated} />)
    fillDetails()
    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    addThreePoints()

    // when
    await act(async () => fireEvent.click(screen.getByRole('button', { name: '생성하기' })))

    // then
    await waitFor(() => expect(teacherTripApi.create).toHaveBeenCalledWith({
      title: '2026년 5학년 2반',
      date: '2026-08-25',
      place: '국립중앙박물관',
      geofencePoints: [
        { latitude: 37.524, longitude: 126.981 },
        { latitude: 37.525, longitude: 126.982 },
        { latitude: 37.523, longitude: 126.983 },
      ],
    }))
    expect(onCreated).toHaveBeenCalledWith()
  })

})

function fillDetails() {
  fireEvent.change(screen.getByLabelText('제목'), { target: { value: '2026년 5학년 2반' } })
  fireEvent.change(screen.getByLabelText('일자'), { target: { value: '2026-08-25' } })
  fireEvent.change(screen.getByLabelText('장소'), { target: { value: '국립중앙박물관' } })
}

function openGeofenceStep() {
  render(<TripCreationFlow onCancel={vi.fn()} onCreated={vi.fn()} />)
  fillDetails()
  fireEvent.click(screen.getByRole('button', { name: '다음' }))
}

function addThreePoints() {
  fireEvent.click(screen.getByRole('button', { name: '첫 점 추가' }))
  fireEvent.click(screen.getByRole('button', { name: '둘째 점 추가' }))
  fireEvent.click(screen.getByRole('button', { name: '셋째 점 추가' }))
}
