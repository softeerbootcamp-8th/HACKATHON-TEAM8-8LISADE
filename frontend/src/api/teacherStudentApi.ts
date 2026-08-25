import type { SubmissionStatus } from '../types/mission'

export interface StudentRosterEntry {
  id: number
  name: string
  outside: boolean
  lastSentAt: string | null
}

export interface StudentMissionStatusEntry {
  missionTitle: string
  status: SubmissionStatus
}

export interface StudentDetail extends StudentRosterEntry {
  phoneNumber: string | null
  parentPhoneNumber: string | null
  joinedAt: string | null
  missions: StudentMissionStatusEntry[]
}

export interface TeacherStudentApi {
  listStudents(tripId: string): Promise<StudentRosterEntry[]>
  getStudentDetail(tripId: string, studentId: number): Promise<StudentDetail>
}

/**
 * Mock data source for the teacher student roster/detail screens (#62). `outside`/`lastSentAt`
 * mirror the shape `GET /api/teacher/trips/{tripId}/locations` (#6) already returns, and `name`
 * mirrors `GET /api/teacher/trips/{tripId}/participants` (#47, not yet merged) — swap this module
 * for a real API client once #47 lands, without changing the screen components.
 * `phoneNumber`/`parentPhoneNumber` have no backend source yet; kept mock until a follow-up issue.
 */
const minutesAgoIso = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const studentsByTrip: Record<string, StudentDetail[]> = {
  'trip-1': [
    { id: 101, name: '김하늘', outside: true, lastSentAt: minutesAgoIso(1), phoneNumber: '010-1234-5601', parentPhoneNumber: '010-9876-5601', joinedAt: '09:05', missions: [{ missionTitle: '첨성대 앞에서 사진 찍기', status: 'COMPLETED' }, { missionTitle: '15시 출발 버스 출석체크', status: 'WAITING' }] },
    { id: 102, name: '박서준', outside: false, lastSentAt: null, phoneNumber: '010-1234-5602', parentPhoneNumber: '010-9876-5602', joinedAt: '09:07', missions: [{ missionTitle: '첨성대 앞에서 사진 찍기', status: 'REJECTED' }, { missionTitle: '15시 출발 버스 출석체크', status: 'WAITING' }] },
    { id: 103, name: '이서연', outside: false, lastSentAt: minutesAgoIso(0), phoneNumber: '010-1234-5603', parentPhoneNumber: '010-9876-5603', joinedAt: '09:04', missions: [{ missionTitle: '첨성대 앞에서 사진 찍기', status: 'COMPLETED' }, { missionTitle: '15시 출발 버스 출석체크', status: 'COMPLETED' }] },
    { id: 104, name: '정민준', outside: false, lastSentAt: minutesAgoIso(1), phoneNumber: '010-1234-5604', parentPhoneNumber: '010-9876-5604', joinedAt: '09:06', missions: [{ missionTitle: '첨성대 앞에서 사진 찍기', status: 'COMPLETED' }, { missionTitle: '15시 출발 버스 출석체크', status: 'WAITING' }] },
    { id: 105, name: '최지우', outside: false, lastSentAt: minutesAgoIso(1), phoneNumber: '010-1234-5605', parentPhoneNumber: '010-9876-5605', joinedAt: '09:05', missions: [{ missionTitle: '첨성대 앞에서 사진 찍기', status: 'WAITING' }, { missionTitle: '15시 출발 버스 출석체크', status: 'WAITING' }] },
  ],
  'trip-2': [],
}

export const mockTeacherStudentApi: TeacherStudentApi = {
  async listStudents(tripId) {
    return (studentsByTrip[tripId] ?? []).map(({ id, name, outside, lastSentAt }) => ({ id, name, outside, lastSentAt }))
  },
  async getStudentDetail(tripId, studentId) {
    const student = (studentsByTrip[tripId] ?? []).find((candidate) => candidate.id === studentId)
    if (!student) throw new Error('학생을 찾을 수 없습니다.')
    return student
  },
}
