export interface CameraAdapter { takePhoto(): Promise<{ uri: string }> }

export const mockCameraAdapter: CameraAdapter = {
  async takePhoto() { return { uri: 'mock://mission-photo.jpg' } },
}
