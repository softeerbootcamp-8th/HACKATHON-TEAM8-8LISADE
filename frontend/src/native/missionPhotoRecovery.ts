import { App, type RestoredListenerEvent } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'
import type { StudentMission } from '../api/missionApi'
import { cameraAdapter } from '../api/cameraAdapter'

const PENDING_MISSION_PHOTO_KEY = 'pending-mission-photo'

export type PendingMissionPhoto = StudentMission & { isResubmission: boolean }
export type PhotoSource = 'camera' | 'gallery'

export async function savePendingMissionPhoto(mission: PendingMissionPhoto): Promise<void> {
  await Preferences.set({ key: PENDING_MISSION_PHOTO_KEY, value: JSON.stringify(mission) })
}

export async function clearPendingMissionPhoto(): Promise<void> {
  await Preferences.remove({ key: PENDING_MISSION_PHOTO_KEY })
}

export async function captureMissionPhoto(mission: PendingMissionPhoto, source: PhotoSource = 'camera'): Promise<{ uri: string }> {
  await savePendingMissionPhoto(mission)
  return source === 'gallery' ? cameraAdapter.pickFromGallery() : cameraAdapter.takePhoto()
}

async function loadPendingMissionPhoto(): Promise<PendingMissionPhoto | null> {
  const { value } = await Preferences.get({ key: PENDING_MISSION_PHOTO_KEY })
  if (!value) return null
  try {
    const mission = JSON.parse(value) as PendingMissionPhoto
    return typeof mission.id === 'number' && mission.type === 'ACTIVITY' ? mission : null
  } catch {
    return null
  }
}

function restoredPhotoUri(event: RestoredListenerEvent): string | null {
  if (event.pluginId !== 'Camera' || event.methodName !== 'takePhoto' || !event.success) return null
  const data = event.data as { webPath?: unknown }
  return typeof data?.webPath === 'string' ? data.webPath : null
}

export async function listenForRestoredMissionPhoto(onRestored: (photo: { mission: PendingMissionPhoto; uri: string }) => void): Promise<{ remove: () => Promise<void> }> {
  return App.addListener('appRestoredResult', async (event) => {
    const uri = restoredPhotoUri(event)
    if (!uri) return
    const mission = await loadPendingMissionPhoto()
    if (mission) onRestored({ mission, uri })
  })
}
