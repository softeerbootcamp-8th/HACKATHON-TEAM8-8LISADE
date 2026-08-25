export interface MissionApi { verifyAttendancePin(pin: string): Promise<void>; uploadPhoto(uri: string): Promise<void> }

export const mockMissionApi: MissionApi = {
  async verifyAttendancePin(pin) {
    if (pin !== '1234') throw new Error('PIN 번호를 확인해 주세요.')
  },
  async uploadPhoto() { return Promise.resolve() },
}
