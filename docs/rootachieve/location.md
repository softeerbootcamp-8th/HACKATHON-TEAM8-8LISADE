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

## Issue #67: 교사용 실시간 위치 지도

- `CurrentLocation`은 최초 이탈 시각을 `outsideSince`에 저장하고 정상 복귀 때
  비운다. 위치 응답과 `LOCATION_UPDATED` SSE payload는 `tripId`, UTC 수신 시각,
  최초 이탈 시각을 함께 제공한다.
- 교사용 위치 조회는 Trip 소유권을 확인한 뒤 최신 위치와 순서가 보장된 지오펜스
  좌표를 반환한다. APP 참가자 이름은 `users`에서 일괄 조회해 명단 응답에 결합한다.
- `teacherLocationApi`는 참가자·최신 위치·지오펜스를 병렬 조회하고 EventSource의
  정상 위치와 이탈 위치를 모두 전달한다.
- `TeacherLocationMap`은 15초 수신 지연을 확인 불가로 분류하고, 상태 필터·학생
  callout·Trip 전환·SSE 위치 반영·자동 범위 조정·드래그 중단·중앙 복귀를 처리한다.
- `TeacherDashboard`는 하단 탭 전환과 체험학습 생성 완료 시 Trip 목록을 다시
  조회해 관리 목록과 위치 선택기에 최신 데이터를 반영한다.

### 검증

- `./gradlew build`: 통과
- `npm test`: 19개 파일, 105개 테스트 통과
- `npm run lint`: 통과
- `npm run build`: 통과

## Issue #85: 위치 추적 신선도·생명주기 계약

- Android 포그라운드 서비스는 1초 수집 요청과 10초 전송 시도를 별도 상수와
  정책으로 운용한다. monotonic clock으로 10초를 넘긴 좌표와 이미 처리한
  `recordedAt`을 제외한다.
- 학생이 초대 코드로 ACTIVE Trip에 참여하거나, 로그인·앱 재실행 뒤 기존 ACTIVE
  Trip이 확인되면 같은 네이티브 시작 경로를 호출한다. ACTIVE Trip이 없으면
  시작하지 않고 로그아웃·401·410에서는 포그라운드 서비스를 중단한다.
- Android UI는 mock 권한 상태 대신 네이티브 위치·알림 권한과 기기 위치 서비스
  상태를 사용한다. 운영 위치 endpoint는 HTTPS만 허용하며 디버그 APK의
  localhost HTTP만 예외로 허용한다. `VITE_API_BASE_URL`이 없을 때의 로컬 기본값은
  `http://localhost:8080`이다.
- Android `HttpURLConnection`에는 WebView의 `JSESSIONID`를 Cookie 헤더로 직접
  첨부한다. localhost HTTP의 만료 쿠키에는 `Secure`를 붙이지 않고 HTTPS에서만
  유지해 로컬 세션 만료도 실제 CookieManager 정책과 맞춘다.
- 실기기 검증에 사용한 Android 전송 로그와 Spring 좌표 DEBUG 로그·로컬 로그
  레벨 설정은 최종 코드에서 제거했다.
- 서버는 현재 위치보다 늦지 않은 `recordedAt`을 멱등 처리한다. 정확도가 없거나
  50m를 초과하면 좌표 시각만 갱신하고 지오펜스 상태·연속 이탈 횟수·이탈 로그는
  변경하지 않는다.
- 이번 백그라운드 범위는 홈 버튼·화면 잠금까지다. 최근 앱 제거·프로세스 재시작
  지속 추적, `ACCESS_BACKGROUND_LOCATION`, 상태 영속 재시작, WorkManager는
  포함하지 않았다.

### 검증

- `./gradlew test`: 백엔드 135개 테스트 통과
- `npm test -- --run`: 프런트 28개 파일, 166개 테스트 통과
- `npm run lint`, `npm run build`, `npx cap sync android`: 통과
- `./gradlew testDebugUnitTest assembleDebug`: Android 14개 테스트와 디버그 APK 조립 통과
- `SM_S911N` 실측: ACTIVE Trip 재로그인 후 `12:15:05`부터 `12:15:55`까지
  약 10초 간격으로 6회 전송되었고 모두 HTTP 200 응답 확인
- `git diff --check`: 통과
