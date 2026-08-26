import { Camera, CameraDirection } from '@capacitor/camera'

export interface CameraAdapter {
  takePhoto(): Promise<{ uri: string }>
  pickFromGallery(): Promise<{ uri: string }>
}

export const cameraAdapter: CameraAdapter = {
  async takePhoto() {
    const photo = await Camera.takePhoto({ quality: 85, cameraDirection: CameraDirection.Rear })
    if (!photo.webPath) throw new Error('촬영한 사진을 읽지 못했습니다.')
    return { uri: photo.webPath }
  },
  async pickFromGallery() {
    const { results } = await Camera.chooseFromGallery({ quality: 85 })
    const webPath = results[0]?.webPath
    if (!webPath) throw new Error('선택한 사진을 읽지 못했습니다.')
    return { uri: webPath }
  },
}
