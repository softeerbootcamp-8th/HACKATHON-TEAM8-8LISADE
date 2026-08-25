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
