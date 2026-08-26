import { describe, expect, it, vi } from 'vitest'

const addListener = vi.hoisted(() => vi.fn())
const get = vi.hoisted(() => vi.fn())
const set = vi.hoisted(() => vi.fn())
const remove = vi.hoisted(() => vi.fn())
const takePhoto = vi.hoisted(() => vi.fn())

vi.mock('@capacitor/app', () => ({ App: { addListener } }))
vi.mock('@capacitor/preferences', () => ({ Preferences: { get, set, remove } }))
vi.mock('../api/cameraAdapter', () => ({ cameraAdapter: { takePhoto } }))

import { captureMissionPhoto, clearPendingMissionPhoto, listenForRestoredMissionPhoto, savePendingMissionPhoto } from './missionPhotoRecovery'

const mission = { id: 11, tripId: 1, title: '사진 미션', description: null, type: 'ACTIVITY' as const, startAt: null, endAt: null, isResubmission: false }

describe('mission photo recovery', () => {
  it('stores only the pending mission before a camera Activity starts', async () => {
    await savePendingMissionPhoto(mission)

    expect(set).toHaveBeenCalledWith({ key: 'pending-mission-photo', value: JSON.stringify(mission) })
  })

  it('records the mission before opening the camera', async () => {
    set.mockResolvedValue(undefined)
    takePhoto.mockResolvedValue({ uri: 'capacitor://mission.jpg' })

    await expect(captureMissionPhoto(mission)).resolves.toEqual({ uri: 'capacitor://mission.jpg' })
    expect(set.mock.invocationCallOrder[0]).toBeLessThan(takePhoto.mock.invocationCallOrder[0])
  })

  it('restores a Camera takePhoto result into its pending mission', async () => {
    get.mockResolvedValue({ value: JSON.stringify(mission) })
    let listener: ((event: { pluginId: string; methodName: string; success: boolean; data: unknown }) => void) | undefined
    addListener.mockImplementation(async (_name, callback) => { listener = callback; return { remove: vi.fn() } })
    const onRestored = vi.fn()

    await listenForRestoredMissionPhoto(onRestored)
    listener?.({ pluginId: 'Camera', methodName: 'takePhoto', success: true, data: { webPath: 'capacitor://restored.jpg' } })
    await vi.waitFor(() => expect(onRestored).toHaveBeenCalledWith({ mission, uri: 'capacitor://restored.jpg' }))
  })

  it('clears the temporary mission after successful submission', async () => {
    await clearPendingMissionPhoto()

    expect(remove).toHaveBeenCalledWith({ key: 'pending-mission-photo' })
  })
})
