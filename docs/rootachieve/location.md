# 위치 수집

## Issue #1: Capacitor 백그라운드 위치 수집

- Vite 빌드 결과를 Capacitor 8 Android 앱에 정적 자산으로 동기화한다.
- 웹은 `BackgroundLocation` 브리지의 `syncSession`, `expireSession`,
  `startTracking`, `stopTracking`, `getStatus`만 호출한다. 브리지는 쿠키 값을
  인자나 반환값으로 다루지 않는다.
- 위치 API 주소는 `syncSession({ locationEndpoint })`에서 HTTPS 주소로
  검증한다. 전송 본문은 `latitude`, `longitude`, `accuracy`, `recordedAt`이다.

### Android

- `CookieManager`의 `JSESSIONID`를 네이티브 `java.net.CookieManager`에
  동기화하고 `HttpsURLConnection`이 요청 쿠키를 자동 첨부한다.
- 위치 수집은 location 타입 Foreground Service와 Fused Location Provider로
  30초마다 수행한다. 서비스는 `START_NOT_STICKY`이며 최근 앱 목록에서 제거될
  때 중지하므로 강제 종료 후 자동 재개하지 않는다.
- 401 응답은 세션 만료로 처리해 양쪽 쿠키를 삭제하고 추적을 중지한 뒤 알림을
  표시한다. 다른 네트워크 오류는 다음 위치에서 재시도한다.

### 검증

- `npm run lint`: 통과
- `npm run test`: 2개 파일, 3개 테스트 통과
- `npm run mobile:android`: Android 정적 자산 동기화 통과
- `./gradlew testDebugUnitTest assembleDebug`: 102개 task 통과
- `npm audit --omit=dev`: 배포 의존성 취약점 0건
