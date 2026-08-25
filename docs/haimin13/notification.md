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
