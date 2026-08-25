import type { StudentTrip } from '../types/studentTrip'

export interface StudentTripApi {
  getActiveTrip(userId: number): Promise<StudentTrip | null>
  joinWithInviteCode(code: string): Promise<StudentTrip>
}

const demoTrip: StudentTrip = { id: 1, title: '경복궁 현장체험학습', place: '경복궁', period: '2026. 08. 25. 09:00 - 16:00', status: 'ACTIVE', missionCompleted: 1, missionTotal: 3, hasSafetyWarning: false }

export const mockStudentTripApi: StudentTripApi = {
  async getActiveTrip() { return null },
  async joinWithInviteCode(code) {
    if (code.toUpperCase() !== 'AB1234') throw new Error('초대 코드를 확인해 주세요.')
    return demoTrip
  },
}
