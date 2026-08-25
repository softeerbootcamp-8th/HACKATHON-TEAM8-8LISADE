import { describe, expect, it } from 'vitest'
import { bufferGeofence } from './geofenceBuffer'

describe('bufferGeofence', () => {
  it('사용자가 지정한 다각형의 바깥으로 20m 확장한 좌표를 만든다', async () => {
    // given
    const points = [
      { latitude: 37.523, longitude: 126.98 },
      { latitude: 37.523, longitude: 126.981 },
      { latitude: 37.524, longitude: 126.981 },
      { latitude: 37.524, longitude: 126.98 },
    ]

    // when
    const buffered = await bufferGeofence(points)

    // then
    expect(Math.min(...buffered.map((point) => point.latitude))).toBeLessThan(37.523)
    expect(Math.max(...buffered.map((point) => point.latitude))).toBeGreaterThan(37.524)
    expect(Math.min(...buffered.map((point) => point.longitude))).toBeLessThan(126.98)
    expect(Math.max(...buffered.map((point) => point.longitude))).toBeGreaterThan(126.981)
    expect(buffered.at(0)).not.toEqual(buffered.at(-1))
  })

  it('꼭짓점이 세 개보다 적으면 버퍼를 만들지 않는다', async () => {
    // given
    const points = [
      { latitude: 37.523, longitude: 126.98 },
      { latitude: 37.524, longitude: 126.981 },
    ]

    // when
    const buffering = bufferGeofence(points)

    // then
    await expect(buffering).rejects.toThrow('꼭짓점을 3개 이상 지정해 주세요.')
  })
})
