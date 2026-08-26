import { describe, expect, it, vi } from 'vitest'

const takePhoto = vi.hoisted(() => vi.fn())

vi.mock('@capacitor/camera', () => ({
  Camera: { takePhoto },
  CameraDirection: { Rear: 'REAR' },
}))

import { cameraAdapter } from './cameraAdapter'

describe('cameraAdapter', () => {
  it('opens only the rear device camera and returns a displayable URI', async () => {
    takePhoto.mockResolvedValue({ webPath: 'capacitor://localhost/_capacitor_file_/mission.jpg' })

    await expect(cameraAdapter.takePhoto()).resolves.toEqual({ uri: 'capacitor://localhost/_capacitor_file_/mission.jpg' })
    expect(takePhoto).toHaveBeenCalledWith({ quality: 85, cameraDirection: 'REAR' })
  })

  it('rejects a camera result without a URI', async () => {
    takePhoto.mockResolvedValue({ webPath: undefined })

    await expect(cameraAdapter.takePhoto()).rejects.toThrow('촬영한 사진을 읽지 못했습니다.')
  })
})
