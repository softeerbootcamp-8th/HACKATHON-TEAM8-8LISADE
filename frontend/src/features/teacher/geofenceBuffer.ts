import type { GeoPoint } from '../../types/teacherTrip'

export async function bufferGeofence(points: GeoPoint[]): Promise<GeoPoint[]> {
  if (points.length < 3) {
    throw new Error('꼭짓점을 3개 이상 지정해 주세요.')
  }

  try {
    const [{ buffer }, { polygon }] = await Promise.all([
      import('@turf/buffer'),
      import('@turf/helpers'),
    ])
    const ring = points.map(({ latitude, longitude }) => [longitude, latitude])
    const buffered = buffer(polygon([[...ring, ring[0]]]), 20, { units: 'meters' })

    if (!buffered || buffered.geometry.type !== 'Polygon') {
      throw new Error()
    }

    return buffered.geometry.coordinates[0].slice(0, -1).map(([longitude, latitude]) => ({
      latitude: Number(latitude.toFixed(7)),
      longitude: Number(longitude.toFixed(7)),
    }))
  } catch {
    throw new Error('유효한 활동 구역을 만들 수 없습니다. 꼭짓점을 다시 지정해 주세요.')
  }
}
