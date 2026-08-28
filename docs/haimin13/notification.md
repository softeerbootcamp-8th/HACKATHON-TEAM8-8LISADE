# FCM 웹 push 구현 기록

## FCM 웹 push 발송 (#10)

- 스키마 마이그레이션(#11)에서 이미 만들어진 `Device`/`DevicePlatform`(`device` 테이블, `fcm_token`/`updated_at` 컬럼) 엔티티를 그대로 쓴다. 새 엔티티를 만들지 않고 `DevicePlatform`에 `WEB`만 추가하고, `Device`에 토큰 재등록 시 소유자/플랫폼을 갱신하는 `reassignTo()`를 추가했다.
- `domain/notification/controller/DeviceController`가 `POST/DELETE /api/notifications/devices`로 로그인한 사용자 소유 토큰의 등록/해제만 처리한다(다른 사용자 토큰 조작 불가).
- `PushNotificationService.sendToUser(userId, title, body)`가 그 유저의 모든 `Device`에 FCM 메시지를 보낸다. `MessagingErrorCode.UNREGISTERED`/`INVALID_ARGUMENT` 응답이면 해당 `Device`를 즉시 삭제한다. 다른 도메인(Trip 이탈, Mission 알림 등)이 이 메서드를 호출하기만 하면 되도록 만들었고, 실제 호출부는 아직 없다.
- `global/config/FirebaseConfig`는 `firebase.credentials-path`(local 기본값 `classpath:firebase-service-account.json`)가 없으면 경고만 남기고 앱은 정상 기동한다.
- **firebase-admin의 gzip 이중 디코딩 버그**: 이 프로젝트 의존성에 Apache HttpClient(4.5.14)가 함께 있으면 google-http-client가 자동 선택하는 `ApacheHttpTransport`가 응답을 두 번 압축 해제해 `send()`가 `ZipException: Not in GZIP format`으로 매번 실패한다. `FirebaseOptions.Builder.setHttpTransport(new NetHttpTransport())`로 transport를 명시해 우회했다.
- 프론트엔드 `firebase/firebaseConfig.ts`는 `Notification.requestPermission()` → `navigator.serviceWorker.register()` → **`navigator.serviceWorker.ready`로 active 상태를 기다린 뒤** `getToken()`을 호출한다. `register()` 직후 바로 `getToken()`을 부르면 서비스 워커가 아직 `installing`/`waiting` 상태라 `AbortError: no active Service Worker`가 난다.
- `public/firebase-messaging-sw.js`는 백그라운드(비활성 탭) 상태에서 온 메시지만 `onBackgroundMessage`로 알림을 띄운다. 탭이 포그라운드면 이 핸들러가 호출되지 않는다 — 포그라운드 처리는 #29에서 `onMessage()`로 추가했다.
- 브라우저에서 알림 권한을 허용해도 macOS 시스템 설정(또는 Chrome 자체)에서 앱 알림이 꺼져 있으면 조용히 무시된다 — 실제 검증 중에도 이 설정 때문에 처음 두 번의 테스트 push가 보이지 않았다.
- Android/iOS 클라이언트 연동은 이 이슈 범위에서 제외했다(Android는 #29, iOS는 계정 확보 후 별도 이슈).

검증: 실제 Chrome 브라우저에서 `getToken()`으로 실제 FCM 토큰을 발급받고, 백엔드에서 `FirebaseMessaging.send()`로 그 토큰에 직접 테스트 메시지를 보내 다른 탭에 있는 상태에서 macOS 알림 수신까지 확인했다(DB/컨트롤러를 거치지 않은 최소 검증). `./gradlew test`, `npx tsc -b`, `npm run lint` 모두 통과.

## FCM 토큰 해제 (#36)

- `firebaseConfig.ts`에 `deleteFcmToken()`을 추가했다. `deleteToken(messaging)`으로 브라우저의 push 구독 자체를 무효화한다 — 기존 `notificationApi.unregisterDevice()`는 서버 DB의 `Device` 레코드만 지우고 브라우저 구독은 그대로 남기던 반쪽짜리 구현이었다.
- 호출 시점(로그아웃 등 트리거)은 이 작업 범위 밖이다. 실제 로그인/로그아웃 플로우가 붙는 시점에 `deleteFcmToken()` + `notificationApi.unregisterDevice(token)`을 함께 호출하도록 연결해야 한다.

## Android FCM push 연동 + 웹 포그라운드 알림 (#29)

- `FirebaseMessagingService`/`FcmPlugin`을 직접 짜는 대신 Capacitor 공식 플러그인 `@capacitor/push-notifications`를 썼다. `npm install` + `npx cap sync android` 한 번으로 `capacitor.build.gradle`/`capacitor.settings.gradle`이 자동으로 의존성을 반영해서, 새로 작성한 네이티브 Java 코드는 0줄이다. `BackgroundLocationPlugin`처럼 커스텀 네이티브 플러그인이 필요했던 이유(포그라운드 서비스 등 표준 플러그인이 커버 못 하는 로직)가 단순 push 수신에는 없다.
- `native/fcm.ts`의 `createNativeFcm(plugin, isNative)`가 `requestPermissions/register/addListener('registration'|'registrationError')/unregister`를 감싸 `requestToken()/onTokenRefresh()/deleteToken()`으로 노출한다. `backgroundLocation.ts`와 동일하게 플러그인을 주입받는 구조라 실제 Capacitor 없이도 단위 테스트가 가능하다.
- `notifications/pushNotifications.ts`의 `createPushNotifications(isNative, native, web, api)`가 플랫폼별 토큰 발급 함수를 선택해 `notificationApi.registerDevice(token, 'WEB'|'ANDROID')`로 등록하고, Android는 토큰 갱신 이벤트도 재등록에 연결한다. `unregister(token)`은 서버 삭제 + 플랫폼별 `deleteToken()`을 함께 호출한다.
- `firebaseConfig.ts`에 `listenForForegroundMessages()`를 추가해 웹이 포그라운드 상태에서도 `onMessage()`로 받은 메시지를 `Notification` API로 직접 띄우게 했다(기존 서비스 워커는 백그라운드만 처리).
- **CSRF/세션 연동은 이번 범위에서 뺐다** — 팀원이 진행 중인 #33(#4 세션 연동)과 겹칠 수 있어서, `pushNotifications.register()`/`listenForForegroundMessages()`는 로그인 성공 시점에 한 줄만 연결하면 되도록 준비만 해뒀고 실제 호출부는 아직 없다.
- Firebase 콘솔에 Android 앱(`com.softeerbootcamp.eightlisade`) 등록, `google-services.json` 추가 완료(`.gitignore` 처리). 실기기 push 수신 검증은 로그인 연동 완료 후 진행한다.

검증: `npx tsc -b`, `npm run lint`, `npx vitest run`(신규 테스트 포함 전체 22개), `npm run build` 통과. Android debug build는 로컬에 Android SDK가 없어 CI로 확인.

## 로그인/로그아웃 push 연동 (#40)

#36과 #29에서 "실제 로그인/로그아웃 플로우가 붙는 시점에 연결해야 한다"고 남겨둔 호출부를 실제로 연결했다. 화면(#21)은 이 이슈 범위가 아니다.

- `api/httpClient.ts`를 새로 만들어 `authApi`에만 있던 CSRF 토큰 조회(`/api/auth/csrf`)와 `ApiResponse` 언래핑을 공용화했다. `notificationApi`가 이걸 재사용하면서 기기 등록/해제에도 CSRF 헤더가 붙는다 — 기존에는 `credentials: 'include'`만 있어서 실제 세션이 붙는 순간 403이 날 코드였다.
- `DeviceController`가 204 No Content로 응답하므로 `httpClient.sendJson()`은 성공 본문을 파싱하지 않는다. `request()`(=`ApiResponse` 언래핑)를 그대로 쓰면 빈 본문 때문에 항상 실패로 판정된다. 실패 시에만 본문에서 `message`를 꺼낸다.
- `notificationApi`가 이제 실패 시 예외를 던진다(기존에는 응답을 통째로 무시). 이 때문에 Android 토큰 갱신 콜백의 재등록 호출(`await` 안 됨)이 unhandled rejection이 될 수 있어 콜백 안에서 잡아준다.
- **로그아웃 시 지울 토큰은 저장소에 남기지 않고 "메모리 기억 + 없으면 FCM 재조회"로 처리한다.** `backgroundLocation`이 세션/추적 상태를 저장하지 않고 네이티브에 `getStatus()`로 되묻는 것과 같은 방침이다(repo 전체에 `localStorage` 사용처 0건). 백그라운드 위치 전송(#1) 중 Android 프로세스가 죽었다 살아나는 사이 FCM이 토큰을 갱신하면 저장해 둔 값은 stale이 되고, 그 상태로 로그아웃하면 엉뚱한 토큰을 지우고 진짜 토큰은 서버에 남아 **로그아웃한 기기에 push가 계속 간다**. 재조회는 항상 현재 토큰을 준다.
- `features/auth/logout.ts`의 `createLogout(push, api)`가 `push.unregister()` → `authApi.logout()` 순서를 강제한다. 서버 토큰 삭제에 세션 쿠키가 필요하므로 순서가 뒤집히면 안 된다. push 해제 실패는 삼키고 로그아웃은 진행한다. #21이 여기에 `backgroundLocation.stopTracking()`만 추가하면 되도록 조합 함수로 분리했다 — 위치 중지는 #21 범위라 넣지 않았다.
- 로그인 성공 시 push 등록은 `await`하지 않는다. 알림 권한 프롬프트가 홈 진입을 막지 않고, FCM 장애가 로그인 실패로 번지지 않는다.

검증: `npm test`(신규 13개 포함 전체 84개), `npm run build`, `npm run lint` 통과. `App.tsx`에 firebase/Capacitor 의존이 import 그래프로 새로 들어와서 dev server를 띄워 시작→로그인 화면 진입까지 확인했고 콘솔 에러 0건이었다. 실제 push 등록/해제 end-to-end(실기기·실브라우저)는 로그아웃 화면(#21)이 나온 뒤 진행한다.

## 포그라운드 push 인앱 표시 (#41)

#29에서 붙인 웹 포그라운드 수신은 `new Notification()`으로 OS 알림만 띄웠고 화면(DOM)은 그대로였다. 탭을 보고 있으면 OS 배너를 놓치는 순간 알림이 온 사실 자체를 모른다. 이번에 화면 안 토스트와 종 아이콘 배지를 붙였다.

- **포그라운드에서는 OS 알림을 띄우지 않는다.** `listenForForegroundMessages()`가 `new Notification()`을 직접 호출하던 것을 핸들러 인자를 받는 형태(`listenForForegroundMessages(handler)`)로 바꿨다. 같은 탭을 보고 있는 상태에서 OS 배너와 인앱 토스트가 같은 문구를 두 번 보여주는 게 이슈에 적힌 "너무 시끄럽지 않게"에 어긋난다. 백그라운드는 `public/firebase-messaging-sw.js`가 그대로 담당하므로 알림이 사라지는 경우는 없다.
- **전역 상태 라이브러리가 없어 모듈 수준 구독 저장소를 썼다.** `notifications/foregroundNotifications.ts`의 `createForegroundNotifications()`가 `subscribe`/`publish`와 `useForegroundNotifications()` 훅을 함께 노출한다. push 수신 구독을 시작하는 쪽은 로그인 시점의 `pushNotifications.register()`이고, 화면은 나중에 마운트되므로 둘을 직접 연결할 수 없다 — 사이에 저장소가 하나 필요하다. React context를 쓰지 않은 이유는 발행자가 React 트리 밖(FCM 콜백)에 있어서 provider로 감쌀 대상이 없기 때문이다.
- 실제 연결은 합성 지점인 `pushNotifications.ts` 하단 한 줄(`listenForegroundMessages: () => listenForForegroundMessages(foregroundNotifications.publish)`)이라 `createPushNotifications`의 시그니처와 기존 테스트는 그대로 둘 수 있었다.
- 토스트(`shared/ui/NotificationToast.tsx`)는 `role="status"`로 스크린리더에 알리고 5초 뒤 자동으로 닫힌다. 닫아도 미확인 상태는 남아 종 배지로 이어진다 — 토스트를 놓친 경우와 확인한 경우를 구분하지 않으면 배지가 거의 안 뜬다.
- **읽음 상태는 클라이언트 세션 한정이다.** 서버 `Notification` 엔티티에 읽음 필드(`readAt`)가 없어서 새로고침하면 배지가 사라진다. 서버 읽음 상태 추가는 이 이슈 범위에 넣지 않았다 — 백엔드 스키마 변경과 API가 함께 필요하다.
- **알림 타입별 문구/이동 분기는 하지 않았다.** 이슈 요구사항에 "종류에 따라 다른 문구/이동이 필요할 수 있다"고 적혀 있지만, 지금 `PushNotificationService`가 `setNotification(title, body)`만 보내고 `data`에 `type`을 싣지 않아 클라이언트가 타입을 알 방법이 없다. 백엔드가 data payload에 `type`을 추가한 뒤 후속 이슈로 다뤄야 한다.
- **Android도 같은 토스트를 쓴다.** 처음에는 네이티브를 범위에서 빼려 했지만, `@capacitor/push-notifications`가 이미 `pushNotificationReceived` 이벤트를 노출하고 있어 Java 수정 없이 TS만으로 연결된다. `nativeFcm.onForegroundMessage()`를 추가하고 `register()`의 네이티브 분기에서 구독한다. **Android는 앱이 포그라운드일 때 notification 메시지를 트레이에 자동 표시하지 않고 이 이벤트로만 전달하므로**(FCM SDK 동작), 웹처럼 OS 알림을 따로 끌 필요 없이 인앱 토스트와 겹치지 않는다.
- 웹/Android 양쪽 브리지가 인자 없는 `onForegroundMessage()`/`listenForegroundMessages()`로 통일돼 있고, 실제 `publish` 연결은 합성 지점에서만 일어난다. `createPushNotifications`는 저장소를 모른다.
- 화면 범위는 교사 화면이다. 학생에게 가는 push가 아직 없어 검증할 대상이 없다.

검증: `npm test -- --run`(신규 15개 포함 전체 171개), `npm run lint`, `npm run build` 통과. 토스트 렌더·종 배지 접근성 이름·배지 해제 흐름은 `TeacherDashboard.test.tsx`에서 실제 DOM으로 확인했다. 실제 FCM push로 뜨는 end-to-end 확인은 로그인 세션과 실서버 push가 필요해 배포 후 진행하고, Android는 실기기 확인이 함께 필요하다.

## 세션 자연 만료 시 FCM device token 정리 (#252)

명시적 로그아웃(`POST /api/auth/logout`)은 세션만 invalidate하고 FCM 토큰 삭제는 클라이언트가 별도로 `DeviceController.unregister()`를 호출해야만 일어나는데, 세션이 30분 타임아웃으로 자연 만료되는 경로(앱 강제 종료, 네트워크 단절 등)에는 그 호출이 없어 `Device` row가 그대로 남아 로그아웃된 기기가 push를 계속 받는 문제를 고쳤다.

- `Device`에 `sessionId`(nullable) 컬럼을 추가했다. Flyway/Liquibase 없이 `ddl-auto: update`(local/prod)를 쓰는 프로젝트라 별도 마이그레이션 스크립트 없이 엔티티 필드 추가만으로 스키마가 반영된다.
- `DeviceController.register()`가 `HttpSession`을 파라미터로 받아 `session.getId()`를 `DeviceService.register(...)`에 함께 넘긴다. 토큰이 이미 있으면 `reassignTo()`가, 새로 만들면 `Device.create()`가 sessionId를 같이 저장/갱신한다.
- `DeviceRepository.deleteBySessionId(String)` / `DeviceService.deleteBySessionId(String)`을 추가했다. `deleteByFcmTokenAndUserId`(명시적 unregister 경로)와는 별도 경로다.
- 세션 만료 감지는 기존 `SseSessionListener.sessionDestroyed()` 하나뿐이라 별도 리스너를 새로 만들지 않고 여기에 `deviceService.deleteBySessionId(event.getSession().getId())` 호출을 추가했다. SSE 연결 해제(`sseConnectionService.disconnect(userId)`, SecurityContext 필요)와 달리 device 정리는 SecurityContext 유무와 무관하게 항상 실행한다 — sessionId 자체가 device를 특정하는 키이므로 인증 정보가 없어도 안전하게 그 세션의 row만 지울 수 있다.
- 핵심 제약(같은 유저의 다른 세션/디바이스 토큰은 건드리지 않음)은 `sessionId`가 세션마다 고유하다는 점으로 자동 만족된다 — `userId` 기준이 아니라 `sessionId` 기준으로만 삭제하기 때문에 다중 세션 로그인 시나리오에서도 안전하다.

검증: `./gradlew build`(전체 테스트 포함) 통과. `DeviceServiceTest`(신규, 등록 시 sessionId 저장/갱신 + `deleteBySessionId` 위임 3케이스), `SseSessionListenerTest`(신규 케이스로 세션 만료 시 `deviceService.deleteBySessionId(session.getId())` 호출 검증 추가), `DeviceControllerTest`(신규 케이스로 등록 응답 후 DB의 `device.session_id`가 실제 `HttpSession` id와 일치하는지 확인)까지 모두 통과.

### 설계 변경: `sessionId` 컬럼 → 세션 attribute 방식 (PR 리뷰 후)

위 구현(`Device.sessionId` 컬럼 + `deleteBySessionId`)을 PR #258 리뷰 단계에서 아래 방식으로 교체했다. **DB 스키마는 그대로 두고(컬럼 추가 없음), `GPS override` 기능이 이미 쓰고 있던 `HttpSession.setAttribute()` 패턴(`LocationController`의 `OVERRIDE_LATITUDE`/`OVERRIDE_LONGITUDE`)을 그대로 재사용한다.**

- `Device` 엔티티의 `sessionId` 컬럼, `Device.create()`/`reassignTo()`의 sessionId 파라미터, `DeviceRepository.deleteBySessionId()`, `DeviceService.deleteBySessionId()`를 모두 되돌렸다 — 원래 있던 `deviceRepository.findByFcmToken`/`deleteByFcmTokenAndUserId` 시그니처로 복귀.
- `DeviceController`에 `FCM_TOKEN_ATTRIBUTE` 상수(`DeviceController.class.getName() + ".fcmToken"`)를 추가하고, `register()`가 토큰 등록에 성공하면 `session.setAttribute(FCM_TOKEN_ATTRIBUTE, request.token())`으로 그 세션에 fcmToken을 기록해둔다.
- `SseSessionListener.sessionDestroyed()`는 세션 attribute에서 `FCM_TOKEN_ATTRIBUTE` 값을 꺼내, 기존처럼 `SecurityContext`에서 얻은 `userId`와 함께 있으면 (둘 다 있을 때만) 기존 명시적 unregister 경로가 쓰던 `deviceService.unregister(userId, fcmToken)`(`deleteByFcmTokenAndUserId`)을 그대로 호출한다. 세션에 attribute가 없으면(한 번도 register 안 한 세션 등) 아무것도 하지 않는다.

바꾼 이유:

1. **스키마 변경 회피** — `Device`에 컬럼을 추가하지 않고도 세션-토큰 매핑을 표현할 수 있다. `ddl-auto: update`라 당장은 위험하지 않지만, 굳이 영구 컬럼을 늘리지 않아도 되는 문제였다.
2. **기존 패턴과의 일관성** — 이 코드베이스는 이미 `LocationController`에서 "세션별로 달라지는, 로그인 기간에만 유효한 값"을 `HttpSession` attribute에 저장하는 패턴을 쓰고 있다. fcmToken도 정확히 같은 성격(세션 생존 기간에만 의미 있는 값)이라 별도 영속 컬럼보다 이 패턴이 더 적합하다.
3. **삭제 경로 재사용** — 새 삭제 메서드(`deleteBySessionId`)를 따로 만들지 않고, 명시적 `DELETE /api/notifications/devices` API가 이미 쓰던 `deleteByFcmTokenAndUserId` 한 경로로 통합했다. 삭제 기준(`fcmToken` + `userId`)이 하나로 유지된다.
4. **다중 세션 격리는 그대로 유지** — 각 세션은 자신만의 `HttpSession` attribute 저장소를 가지므로, 한 세션이 만료돼도 그 세션에 저장된 fcmToken 하나만 꺼내 지운다. 같은 유저가 폰 앱 + 웹탭처럼 여러 세션에 로그인해 있어도 다른 세션의 attribute/토큰은 전혀 건드리지 않는다 — 원래 이슈의 핵심 제약을 그대로 만족한다.

검증: `./gradlew build`(전체 테스트 포함) 통과. `DeviceServiceTest`/`DeviceControllerTest`/`SseSessionListenerTest`를 세션 attribute 흐름에 맞춰 갱신(등록 시 세션에 토큰 저장 확인, 세션 만료 시 `deviceService.unregister(userId, token)` 호출 검증, attribute 없을 때는 아무 것도 안 하는 케이스 포함).
