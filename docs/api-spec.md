# 8LISADE API 명세

> 이 문서는 `backend/src/main/java/com/palisade/travel` 의 Controller / DTO / SecurityConfig 를 기준으로 작성했다.
> Notion 에 그대로 붙여넣으면 제목·표·코드블록이 유지된다.

---

## 1. 공통 규약

| 항목 | 값 |
| --- | --- |
| Base URL (local) | `http://localhost:8080` |
| Content-Type | `application/json` |
| 인증 방식 | 세션 쿠키 (`JSESSIONID`) — 로그인 시 발급 |
| CSRF | 쿠키 기반 (`XSRF-TOKEN`), 변경 요청 시 `X-CSRF-TOKEN` 헤더 필요 |
| CSRF 예외 | `/api/student/locations`, `/mock-storage/**` |
| CORS | `http://localhost:5173` 허용, credentials 포함 |

### 성공 응답 포맷

```json
{
  "success": true,
  "data": { }
}
```

- `204 No Content` 응답은 body 가 없다.
- `data` 가 없는 성공 응답은 `"data": null`.

### 에러 응답 포맷

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed.",
  "details": [
    { "field": "title", "message": "must not be blank" }
  ]
}
```

- `details` 는 검증 실패(`VALIDATION_ERROR`) 일 때만 채워진다. 그 외에는 `null`.

### 권한 규칙

| 경로 패턴 | 권한 |
| --- | --- |
| `/api/health`, `/api/auth/login`, `/api/auth/signup`, `/api/auth/csrf`, `/mock-storage/**` | 인증 불필요 |
| `/api/student/**` | `ROLE_STUDENT` |
| `/api/teacher/**` | `ROLE_TEACHER` |
| 그 외 전체 | 로그인 필요 (역할 무관) |

---

## 2. Enum 정의

| Enum | 값 |
| --- | --- |
| `UserRole` | `STUDENT`, `TEACHER` |
| `TripStatus` | `READY`, `ACTIVE`, `FINISHED` |
| `TripParticipantType` | `APP`, `MANUAL` |
| `MissionType` | `ACTIVITY`, `CHECK` |
| `SubmissionStatus` | `WAITING`, `COMPLETED`, `REJECTED`, `EXPIRED` |
| `DevicePlatform` | `WEB`, `ANDROID`, `IOS` |
| `NotificationType` | `RANGE_EXIT`, `MISSION_CREATED`, `MISSION_INCOMPLETED`, `UNREACHABLE` |
| `SseEventType` | `CONNECTED`, `HEARTBEAT`, `LOCATION_UPDATED` |

---

## 3. 엔드포인트 요약

| # | Method | Path | 권한 | 설명 |
| --- | --- | --- | --- | --- |
| 1 | GET | `/api/health` | 공개 | 헬스 체크 |
| 2 | POST | `/api/auth/signup` | 공개 | 회원가입 |
| 3 | POST | `/api/auth/login` | 공개 | 로그인 |
| 4 | GET | `/api/auth/csrf` | 공개 | CSRF 토큰 발급 |
| 5 | GET | `/api/auth/me` | 인증 | 내 정보 조회 |
| 6 | POST | `/api/auth/logout` | 인증 | 로그아웃 |
| 7 | POST | `/api/teacher/trips` | TEACHER | 여행 생성 |
| 8 | GET | `/api/teacher/trips` | TEACHER | 내 여행 목록 |
| 9 | POST | `/api/teacher/trips/{tripId}/invite-code` | TEACHER | 초대 코드 재발급 |
| 10 | GET | `/api/teacher/trips/{tripId}/participants` | TEACHER | 참가자 목록 |
| 11 | POST | `/api/teacher/trips/{tripId}/participants/manual` | TEACHER | 수동 참가자 추가 |
| 12 | POST | `/api/student/trips/join` | STUDENT | 초대 코드로 참여 |
| 13 | GET | `/api/student/trips/active` | STUDENT | 참여 중인 여행 조회 |
| 14 | POST | `/api/student/locations` | STUDENT | 위치 전송 |
| 15 | GET | `/api/teacher/trips/{tripId}/locations` | TEACHER | 학생 위치 스냅샷 |
| 16 | GET | `/api/teacher/sse/connect` | TEACHER | SSE 구독 |
| 17 | POST | `/api/teacher/trips/{tripId}/missions` | TEACHER | 미션 생성 |
| 18 | GET | `/api/teacher/trips/{tripId}/missions` | TEACHER | 미션 목록(교사) |
| 19 | PATCH | `/api/teacher/missions/{missionId}` | TEACHER | 미션 수정 |
| 20 | DELETE | `/api/teacher/missions/{missionId}` | TEACHER | 미션 삭제 |
| 21 | GET | `/api/teacher/missions/{missionId}/pin` | TEACHER | 출석 PIN 조회 |
| 22 | GET | `/api/teacher/missions/{missionId}/status-board` | TEACHER | 미션 현황판 |
| 23 | POST | `/api/teacher/missions/{missionId}/submissions/{studentId}/reject` | TEACHER | 제출 반려 |
| 24 | POST | `/api/teacher/missions/{missionId}/submissions/{studentId}/complete` | TEACHER | 대리 완료 처리 |
| 25 | GET | `/api/trips/{tripId}/missions/current` | 인증 | 현재 진행 미션 |
| 26 | GET | `/api/missions/{missionId}` | 인증 | 미션 상세 |
| 27 | POST | `/api/missions/{missionId}/photo-upload` | 인증 | 사진 업로드 URL 발급 |
| 28 | POST | `/api/missions/{missionId}/submissions/photo` | 인증 | 사진 미션 제출 |
| 29 | POST | `/api/missions/{missionId}/submissions/pin` | 인증 | PIN 미션 제출 |
| 30 | GET | `/api/missions/{missionId}/submission` | 인증 | 내 제출 조회 |
| 31 | POST | `/api/notifications/devices` | 인증 | 기기 토큰 등록 |
| 32 | DELETE | `/api/notifications/devices` | 인증 | 기기 토큰 해제 |
| 33 | GET | `/api/teacher/notifications` | TEACHER | 교사 수신 알림 목록 조회 |
| 34 | PUT | `/mock-storage/{objectKey}` | 공개 (local/test) | 로컬 목 스토리지 업로드 |

---

## 4. 인증 (Auth)

### 4.1 POST `/api/auth/signup` — 회원가입

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `role` | `UserRole` | O | `STUDENT` / `TEACHER` |
| `name` | string | O | 공백 불가 |
| `loginId` | string | O | 공백 불가, 중복 불가 |
| `password` | string | O | 8~20자, 공백 불가 |
| `phoneNumber` | string | X | 한국 휴대폰 번호 형식 |
| `parentNumber` | string | X | 학생일 때 보호자 번호 |
| `guardianConsent` | boolean | X | 학생일 때 보호자 동의 필요 |

```json
{
  "role": "STUDENT",
  "name": "김학생",
  "loginId": "student01",
  "password": "password123",
  "phoneNumber": "01012345678",
  "parentNumber": "01098765432",
  "guardianConsent": true
}
```

**Response `200 OK`**

```json
{ "success": true, "data": null }
```

**에러**

| code | status | 설명 |
| --- | --- | --- |
| `DUPLICATE_LOGIN_ID` | 400 | 이미 사용 중인 로그인 ID |
| `ROLE_PROFILE_REQUIRED` | 400 | 역할별 필수 정보 누락 |
| `GUARDIAN_CONSENT_REQUIRED` | 400 | 보호자 동의 누락 |
| `INVALID_PASSWORD` | 400 | 비밀번호 형식 오류 |
| `INVALID_PHONE_NUMBER` | 400 | 전화번호 형식 오류 |

---

### 4.2 POST `/api/auth/login` — 로그인

**Request Body**

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `loginId` | string | O |
| `password` | string | O |

**Response `200 OK`** — 세션 쿠키(`JSESSIONID`) 발급

```json
{
  "success": true,
  "data": {
    "id": 1,
    "loginId": "student01",
    "name": "김학생",
    "role": "STUDENT",
    "phoneNumber": "01012345678"
  }
}
```

**에러**: `UNAUTHORIZED` (401) — 아이디/비밀번호 불일치

---

### 4.3 GET `/api/auth/me` — 내 정보 조회

**Response `200 OK`** — 로그인 응답의 `data` 와 동일한 `CurrentUserResponse`.

**에러**: `UNAUTHORIZED` (401)

---

### 4.4 POST `/api/auth/logout` — 로그아웃

**Response `200 OK`**

```json
{ "success": true, "data": null }
```

---

### 4.5 GET `/api/auth/csrf` — CSRF 토큰 발급

**Response `200 OK`**

```json
{
  "success": true,
  "data": {
    "token": "9f8b...",
    "headerName": "X-CSRF-TOKEN"
  }
}
```

---

## 5. 여행 (Trip) — 교사

### 5.1 POST `/api/teacher/trips` — 여행 생성

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `title` | string | O | 최대 100자 |
| `place` | string | O | 최대 200자 |
| `description` | string | X | — |
| `startAt` | datetime | O | ISO-8601 (`2026-03-01T09:00:00`) |
| `endAt` | datetime | O | ISO-8601 |
| `geofencePoints` | array | O | 3~1000개 |
| `geofencePoints[].latitude` | decimal | O | -90 ~ 90, 소수점 7자리 |
| `geofencePoints[].longitude` | decimal | O | -180 ~ 180, 소수점 7자리 |

```json
{
  "title": "경주 수학여행",
  "place": "경주 불국사",
  "description": "1학년 2반",
  "startAt": "2026-03-01T09:00:00",
  "endAt": "2026-03-03T18:00:00",
  "geofencePoints": [
    { "latitude": 35.7900000, "longitude": 129.3320000 },
    { "latitude": 35.7910000, "longitude": 129.3330000 },
    { "latitude": 35.7890000, "longitude": 129.3340000 }
  ]
}
```

**Response `201 Created`**

```json
{
  "success": true,
  "data": { "code": "AB1234", "expiresAt": "2026-03-01T09:00:00" }
}
```

---

### 5.2 GET `/api/teacher/trips` — 내 여행 목록

**Response `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "tripId": 1,
      "title": "경주 수학여행",
      "place": "경주 불국사",
      "startAt": "2026-03-01T09:00:00",
      "status": "ACTIVE"
    }
  ]
}
```

---

### 5.3 POST `/api/teacher/trips/{tripId}/invite-code` — 초대 코드 재발급

| 파라미터 | 위치 | 타입 |
| --- | --- | --- |
| `tripId` | path | number |

**Response `200 OK`** — `InviteCodeResponse` (`code`, `expiresAt`)

**에러**: `TRIP_NOT_FOUND` (404), `TRIP_ACCESS_DENIED` (403)

---

### 5.4 GET `/api/teacher/trips/{tripId}/participants` — 참가자 목록

**Response `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "id": 10,
      "userId": 3,
      "name": "김학생",
      "type": "APP",
      "createdAt": "2026-03-01T09:10:00"
    },
    {
      "id": 11,
      "userId": null,
      "name": "이학생",
      "type": "MANUAL",
      "createdAt": "2026-03-01T09:12:00"
    }
  ]
}
```

---

### 5.5 POST `/api/teacher/trips/{tripId}/participants/manual` — 수동 참가자 추가

**Request Body**

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `name` | string | O (공백 불가) |

**Response `201 Created`** — `TripParticipantResponse` (`type` 은 `MANUAL`)

---

## 6. 여행 (Trip) — 학생

### 6.1 POST `/api/student/trips/join` — 초대 코드로 참여

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `code` | string | O | 영문 2자 + 숫자 4자 (`AB1234`) |

**Response `200 OK`**

```json
{
  "success": true,
  "data": { "tripId": 1, "title": "경주 수학여행", "place": "경주 불국사", "status": "ACTIVE" }
}
```

**에러**

| code | status | 설명 |
| --- | --- | --- |
| `INVALID_INVITE_CODE` | 400 | 코드가 유효하지 않거나 만료 |
| `ACTIVE_TRIP_ALREADY_JOINED` | 409 | 이미 진행 중인 여행에 참여 중 |

---

### 6.2 GET `/api/student/trips/active` — 참여 중인 여행 조회

**Response `200 OK`** — `JoinTripResponse` 와 동일한 형태

**에러**: `PARTICIPATING_TRIP_NOT_FOUND` (404)

---

## 7. 위치 (Location)

### 7.1 POST `/api/student/locations` — 위치 전송

> CSRF 검사 예외 경로. 세션 인증과 `STUDENT` 역할 검사는 그대로 적용된다.

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `latitude` | decimal | O | -90 ~ 90 |
| `longitude` | decimal | O | -180 ~ 180 |
| `accuracy` | decimal | X | 0 이상 (미터) |
| `recordedAt` | instant | O | ISO-8601 UTC (`2026-03-01T09:00:00Z`) |

```json
{
  "latitude": 35.7901234,
  "longitude": 129.3321234,
  "accuracy": 12.5,
  "recordedAt": "2026-03-01T09:00:00Z"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "data": { "tripId": 1, "outside": false, "consecutiveOutsideCount": 0 }
}
```

| 필드 | 설명 |
| --- | --- |
| `outside` | 지오펜스 이탈 여부 |
| `consecutiveOutsideCount` | 연속 이탈 횟수 (복귀 시 0으로 리셋) |

**부수 효과**: 담당 교사에게 `LOCATION_UPDATED` SSE 이벤트를 전송하고, 이탈 시 위치 로그를 저장한다.

**에러**

| code | status |
| --- | --- |
| `PARTICIPATING_TRIP_NOT_FOUND` | 404 |
| `TRIP_INACTIVE` | 410 |
| `GEOFENCE_NOT_CONFIGURED` | 422 |

---

### 7.2 GET `/api/teacher/trips/{tripId}/locations` — 학생 위치 스냅샷

**Response `200 OK`**

```json
{
  "success": true,
  "data": [
    {
      "userId": 3,
      "latitude": 35.7901234,
      "longitude": 129.3321234,
      "outside": false,
      "updatedAt": "2026-03-01T09:00:05"
    }
  ]
}
```

**에러**: `TRIP_NOT_FOUND` (404), `TRIP_ACCESS_FORBIDDEN` (403)

---

## 8. 실시간 알림 (SSE)

### 8.1 GET `/api/teacher/sse/connect` — SSE 구독

| 항목 | 값 |
| --- | --- |
| 권한 | TEACHER |
| `Accept` | `text/event-stream` |
| 연결 타임아웃 | 30분 |
| Heartbeat 주기 | 15초 |

**이벤트 종류**

| event | data | 설명 |
| --- | --- | --- |
| `CONNECTED` | `"connected"` | 연결 직후 1회 |
| `HEARTBEAT` | `"ping"` | 15초마다 |
| `LOCATION_UPDATED` | `StudentLocationResponse` | 담당 학생 위치 갱신 시 |

```text
event: LOCATION_UPDATED
data: {"userId":3,"latitude":35.7901234,"longitude":129.3321234,"outside":true,"updatedAt":"2026-03-01T09:00:05"}
```

---

## 9. 미션 (Mission) — 교사

### 9.1 POST `/api/teacher/trips/{tripId}/missions` — 미션 생성

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `title` | string | O | 공백 불가 |
| `description` | string | X | — |
| `type` | `MissionType` | O | `ACTIVITY`(사진) / `CHECK`(PIN 출석) |
| `startAt` | datetime | X | — |
| `endAt` | datetime | X | `startAt` 이후여야 함 |

**Response `201 Created`**

```json
{
  "success": true,
  "data": {
    "id": 5,
    "tripId": 1,
    "title": "불국사 앞에서 단체사진",
    "description": "조별로 한 장",
    "type": "ACTIVITY",
    "startAt": "2026-03-01T10:00:00",
    "endAt": "2026-03-01T12:00:00"
  }
}
```

**에러**: `INVALID_REQUEST` (400, `endAt < startAt`), `FORBIDDEN` (403, 담당 교사 아님)

---

### 9.2 GET `/api/teacher/trips/{tripId}/missions` — 미션 목록

**Response `200 OK`** — `MissionResponse` 배열

---

### 9.3 PATCH `/api/teacher/missions/{missionId}` — 미션 수정

**Request Body** — 생성과 동일한 `MissionCreateRequest` (단 `type` 은 변경되지 않는다)

**Response `200 OK`** — `MissionResponse`

---

### 9.4 DELETE `/api/teacher/missions/{missionId}` — 미션 삭제

**Response `204 No Content`** (body 없음)

---

### 9.5 GET `/api/teacher/missions/{missionId}/pin` — 출석 PIN 조회

> `CHECK` 타입 미션에서만 사용 가능.

**Response `200 OK`**

```json
{ "success": true, "data": "4821" }
```

**에러**: `INVALID_REQUEST` (400, `CHECK` 타입 아님), `FORBIDDEN` (403)

---

### 9.6 GET `/api/teacher/missions/{missionId}/status-board` — 미션 현황판

**Response `200 OK`**

```json
{
  "success": true,
  "data": {
    "mission": {
      "id": 5,
      "tripId": 1,
      "title": "불국사 앞에서 단체사진",
      "description": "조별로 한 장",
      "type": "ACTIVITY",
      "startAt": "2026-03-01T10:00:00",
      "endAt": "2026-03-01T12:00:00"
    },
    "totalStudentCount": 24,
    "submitted": [
      {
        "studentId": 3,
        "studentName": "김학생",
        "imageKey": "upload/missions/5/students/3/uuid.jpg",
        "imageUrl": "https://....s3.ap-northeast-2.amazonaws.com/upload/missions/5/students/3/uuid.jpg?X-Amz-Signature=...",
        "submittedAt": "2026-03-01T10:30:00"
      }
    ],
    "notSubmitted": [
      { "studentId": 4, "studentName": "이학생", "rejectionReason": "얼굴이 안 보여요" }
    ]
  }
}
```

| 필드 | 설명 |
| --- | --- |
| `totalStudentCount` | 여행 참가 학생 수 |
| `submitted[]` | 제출 완료 학생 |
| `submitted[].imageKey` | S3 object key |
| `submitted[].imageUrl` | **5분 만료** presigned 조회 URL. 사진이 없는 제출(PIN 미션·교사 대리 완료)은 `null` |
| `notSubmitted[].rejectionReason` | 반려된 경우 사유, 미제출이면 `null` |

운영 버킷은 비공개다. `imageUrl` 은 담당 교사가 이 API 를 호출한 시점에 발급되며 5분 뒤 만료되므로, 프론트는 URL 을 장기 보관하지 말고 만료되면 현황판을 다시 조회한다.

---

### 9.7 POST `/api/teacher/missions/{missionId}/submissions/{studentId}/reject` — 제출 반려

**Request Body**

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `reason` | string | O (공백 불가) |

**Response `200 OK`**

```json
{ "success": true, "data": null }
```

**에러**: `INVALID_REQUEST` (400, 제출 없음), `FORBIDDEN` (403)

---

### 9.8 POST `/api/teacher/missions/{missionId}/submissions/{studentId}/complete` — 대리 완료 처리

교사가 학생 대신 미션을 완료 처리한다 (수동 참가자·기기 문제 대응).

**Response `200 OK`**

```json
{ "success": true, "data": null }
```

---

## 10. 미션 (Mission) — 학생

### 10.1 GET `/api/trips/{tripId}/missions/current` — 현재 진행 미션 목록

시작 시각이 지났고 아직 만료되지 않은 미션만 반환한다. 해당 여행 참가자만 조회 가능.

**Response `200 OK`** — `MissionResponse` 배열 (`startAt` 오름차순)

**에러**: `FORBIDDEN` (403, 참가자 아님)

---

### 10.2 GET `/api/missions/{missionId}` — 미션 상세

**Response `200 OK`** — `MissionResponse`

**에러**: `INVALID_REQUEST` (400, 미션 없음), `FORBIDDEN` (403, 참가자 아니거나 접근 가능 시간 아님)

---

### 10.3 POST `/api/missions/{missionId}/photo-upload` — 사진 업로드 URL 발급

`ACTIVITY` 타입 미션에서만 사용. 발급된 `uploadUrl` 에 `PUT` 으로 이미지를 직접 올린 뒤, `objectKey` 를 제출 API 에 넘긴다.

**Response `200 OK`**

```json
{
  "success": true,
  "data": {
    "objectKey": "upload/missions/5/students/3/3f2a...-.jpg",
    "uploadUrl": "https://.../upload/missions/5/students/3/3f2a...-.jpg?X-Amz-Signature=..."
  }
}
```

**에러**: `INVALID_REQUEST` (400, `ACTIVITY` 아님 또는 마감됨)

---

### 10.4 POST `/api/missions/{missionId}/submissions/photo` — 사진 미션 제출

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `objectKey` | string | O | 발급받은 키와 동일해야 함 |

**Response `200 OK`**

```json
{
  "success": true,
  "data": {
    "submissionId": 42,
    "status": "WAITING",
    "imageKey": "upload/missions/5/students/3/3f2a...-.jpg"
  }
}
```

**에러**: `INVALID_REQUEST` (400) — `ACTIVITY` 아님 / 마감됨 / `objectKey` 불일치 / 이미 제출됨(반려 상태만 재제출 가능)

---

### 10.5 POST `/api/missions/{missionId}/submissions/pin` — PIN 미션 제출

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `pin` | string | O | 숫자 4자리 |

**Response `200 OK`**

```json
{
  "success": true,
  "data": { "submissionId": 43, "status": "COMPLETED", "imageKey": null }
}
```

**에러**: `INVALID_REQUEST` (400) — `CHECK` 아님 / PIN 불일치 / 마감됨

---

### 10.6 GET `/api/missions/{missionId}/submission` — 내 제출 조회

**Response `200 OK`** — `SubmissionResponse`

---

## 11. 알림 기기 (Notification Device)

### 11.1 POST `/api/notifications/devices` — 기기 토큰 등록

**Request Body**

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | --- | --- |
| `token` | string | O | FCM 토큰, 공백 불가 |
| `platform` | `DevicePlatform` | O | `WEB` / `ANDROID` / `IOS` |

**Response `204 No Content`** (body 없음)

---

### 11.2 DELETE `/api/notifications/devices` — 기기 토큰 해제

**Request Body**

| 필드 | 타입 | 필수 |
| --- | --- | --- |
| `token` | string | O |

**Response `204 No Content`** (body 없음)

---

### 11.3 GET `/api/teacher/notifications` — 교사 수신 알림 목록 조회

| 항목 | 값 |
| --- | --- |
| 권한 | TEACHER |

인증 교사에게 온 모든 알림을 `createdAt` 최신순으로 반환한다(유형 무관).

**Response `200 OK`** — `data`: 배열

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | number | 알림 ID |
| `type` | `NotificationType` | 알림 유형 |
| `tripId` | number \| null | 관련 Trip |
| `missionId` | number \| null | 관련 미션(미완료 등) |
| `title` | string | 제목 |
| `message` | string | 본문 |
| `createdAt` | datetime | 생성 시각 |

#### 교사 알림 정책 (§6.1)

| 알림 | 유형 | 발송 조건 | 횟수 규칙 |
| --- | --- | --- | --- |
| 미션 미완료 | `MISSION_INCOMPLETED` | 미션 마감 시각에 미완료 학생이 있을 때. 출석체크(`CHECK`)는 마감이 없어 발송하지 않는다. | 미션당 1회, 미완료 인원 요약 |
| 이탈 발생 | `RANGE_EXIT` | 학생이 이탈 판정될 때 | 학생당 1회, 해제 후 다시 이탈하면 재발송 |
| 위치 확인 불가 | `UNREACHABLE` | 확인 불가 3분 지속 시 | 학생당 1회 |

> 미완료(마감 배치)·확인 불가(3분 미수신 감지)의 발송 트리거 로직은 후속 이슈에서 구현한다. 현재 자동 발송은 이탈(`RANGE_EXIT`)만 동작한다.

---

## 12. 기타

### 12.1 GET `/api/health` — 헬스 체크

```json
{ "success": true, "data": { "status": "UP" } }
```

### 12.2 PUT `/mock-storage/{objectKey}` — 로컬 목 스토리지

`local`, `test` 프로파일에서만 활성화된다. presigned URL 대체용으로 항상 `204 No Content` 를 반환한다.

---

## 13. 에러 코드 전체 목록

| code | status | 메시지 | 발생 영역 |
| --- | --- | --- | --- |
| `INVALID_REQUEST` | 400 | Invalid request. | 공통 / 미션 |
| `VALIDATION_ERROR` | 400 | Validation failed. | 공통 (Bean Validation) |
| `UNAUTHORIZED` | 401 | Authentication is required. | 공통 / 로그인 |
| `FORBIDDEN` | 403 | Access is denied. | 공통 / 미션 |
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected error occurred. | 공통 |
| `DUPLICATE_LOGIN_ID` | 400 | Login ID is already in use. | 회원가입 |
| `ROLE_PROFILE_REQUIRED` | 400 | Required profile information is missing. | 회원가입 |
| `GUARDIAN_CONSENT_REQUIRED` | 400 | Guardian consent is required. | 회원가입 |
| `INVALID_PASSWORD` | 400 | Password must be 8 to 20 characters without spaces. | 회원가입 |
| `INVALID_PHONE_NUMBER` | 400 | Phone number must be a valid Korean mobile number. | 회원가입 |
| `TRIP_NOT_FOUND` | 404 | Trip not found. | 여행 / 위치 |
| `TRIP_ACCESS_DENIED` | 403 | Trip access denied. | 여행 |
| `TRIP_ACCESS_FORBIDDEN` | 403 | The trip does not belong to the current teacher. | 위치 |
| `INVALID_INVITE_CODE` | 400 | Invalid invite code. | 여행 참여 |
| `ACTIVE_TRIP_ALREADY_JOINED` | 409 | Student already joined an active trip. | 여행 참여 |
| `PARTICIPATING_TRIP_NOT_FOUND` | 404 | Participating trip was not found. | 위치 / 학생 여행 |
| `TRIP_INACTIVE` | 410 | Trip is no longer active. | 위치 |
| `GEOFENCE_NOT_CONFIGURED` | 422 | A valid geofence is not configured for the trip. | 위치 |
