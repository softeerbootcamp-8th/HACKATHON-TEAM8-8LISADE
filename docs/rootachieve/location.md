# 위치 수집

## Issue #1: Capacitor 백그라운드 위치 수집

- Vite 빌드 결과를 Capacitor 8 Android 앱에 정적 자산으로 동기화한다.
- 웹은 `BackgroundLocation` 브리지의 `syncSession`, `expireSession`,
  `startTracking`, `stopTracking`, `getStatus`만 호출한다. 브리지는 쿠키 값을
  인자나 반환값으로 다루지 않는다.
- 위치 API 주소는 `syncSession({ apiBaseUrl })`이
  `/api/student/locations`를 결합한 뒤 네이티브에서 HTTPS 주소로 검증한다.
  전송 본문은 `latitude`, `longitude`, `accuracy`, `recordedAt`이다.

### Android

- `CookieManager`의 `JSESSIONID`를 네이티브 `java.net.CookieManager`에
  동기화하고 `HttpsURLConnection`이 요청 쿠키를 자동 첨부한다.
- 위치 수집은 location 타입 Foreground Service와 Fused Location Provider로
  10초마다 수행한다. 서비스는 `START_NOT_STICKY`이며 최근 앱 목록에서 제거될
  때 중지하므로 강제 종료 후 자동 재개하지 않는다.
- 401 응답은 세션 만료로 처리해 양쪽 쿠키를 삭제하고 추적을 중지한 뒤 알림을
  표시한다. 410 응답은 세션을 유지하고 추적만 중지하며, 다른 네트워크 오류는
  다음 위치에서 재시도한다.

### 검증

- `npm run lint`: 통과
- `npm run test`: 2개 파일, 3개 테스트 통과
- `npm run mobile:android`: Android 정적 자산 동기화 통과
- `./gradlew testDebugUnitTest assembleDebug`: 102개 task 통과
- `npm audit --omit=dev`: 배포 의존성 취약점 0건

## Issue #1 후속: 학생 위치 API 전송 계약

- 웹뷰는 세션 동기화 후 `startTracking()`을 시작 신호로 보낸다. 기존 Android
  Foreground Service가 이 신호부터 10초 목표 주기로 위치를 전송한다.
- 브리지가 API base URL과 고정 경로 `/api/student/locations`를 결합하므로
  프론트가 위치 endpoint를 임의로 조립하지 않는다.
- `TrackingResponsePolicy`는 401의 세션 만료와 410의 추적 종료를 분리한다.
  410에서는 쿠키와 세션 상태를 삭제하지 않는다.

### 검증

- `npm run test`: 2개 파일, 13개 테스트 통과
- `npm run lint`: 통과
- `npm run mobile:android`: TypeScript/Vite 빌드와 Capacitor sync 통과
- `./gradlew testDebugUnitTest assembleDebug`: 102개 task 통과
- `git diff --check`: 통과

## Issue #13: 학생 위치 저장 및 안전 구역 이탈 판정

- `POST /api/student/locations`는 Android가 전송한 `latitude`, `longitude`,
  선택값 `accuracy`, `recordedAt`을 받는다. 학생 `JSESSIONID` 세션은 유지하되
  네이티브 호출 경로만 CSRF 검사에서 제외한다.
- 컨트롤러는 입력 검증, `Authentication`의 사용자 ID 추출, 서비스 호출만
  담당한다. 최근 참여 여행 조회, 종료 여부 확인, 지오펜스 판정, 현재 위치
  갱신, 이탈 카운트와 로그 저장은 `LocationService`가 처리한다.
- 여행이 종료됐으면 `410 TRIP_INACTIVE`를 반환해 Android 수집을 중단한다.
  유효한 지오펜스가 없으면 `422 GEOFENCE_NOT_CONFIGURED`를 반환한다.
- 지오펜스 판정은 ray casting을 사용해 볼록·오목 다각형과 CW·CCW 순서를
  모두 지원하며 경계 위 좌표는 내부로 본다.
- 외부 좌표는 `location_log`에 저장하고 사용자별 연속 이탈 횟수를 증가시킨다.
  내부 좌표는 횟수를 0으로 초기화한다. 현재 위치 SSE 전송과 정확히 12회일
  때의 알림 전송은 후속 연동 지점에 TODO로 남겼다.

### 검증

- `./gradlew build --rerun-tasks`: 8개 task 전체 실행, 통과
- `git diff --check origin/develop...HEAD`: 통과
