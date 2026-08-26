import { Camera, CameraDirection } from '@capacitor/camera'

export interface CameraAdapter { takePhoto(): Promise<{ uri: string }> }

export const cameraAdapter: CameraAdapter = {
  async takePhoto() {
    const photo = await Camera.takePhoto({ quality: 85, cameraDirection: CameraDirection.Rear })
    if (!photo.webPath) throw new Error('촬영한 사진을 읽지 못했습니다.')
    return { uri: photo.webPath }
  },
}
