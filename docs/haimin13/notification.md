# FCM 웹 push 구현 기록

## FCM 웹 push 발송 (#10)

- 스키마 마이그레이션(#11)에서 이미 만들어진 `Device`/`DevicePlatform`(`device` 테이블, `fcm_token`/`updated_at` 컬럼) 엔티티를 그대로 쓴다. 새 엔티티를 만들지 않고 `DevicePlatform`에 `WEB`만 추가하고, `Device`에 토큰 재등록 시 소유자/플랫폼을 갱신하는 `reassignTo()`를 추가했다.
- `domain/notification/controller/DeviceController`가 `POST/DELETE /api/notifications/devices`로 로그인한 사용자 소유 토큰의 등록/해제만 처리한다(다른 사용자 토큰 조작 불가).
- `PushNotificationService.sendToUser(userId, title, body)`가 그 유저의 모든 `Device`에 FCM 메시지를 보낸다. `MessagingErrorCode.UNREGISTERED`/`INVALID_ARGUMENT` 응답이면 해당 `Device`를 즉시 삭제한다. 다른 도메인(Trip 이탈, Mission 알림 등)이 이 메서드를 호출하기만 하면 되도록 만들었고, 실제 호출부는 아직 없다.
- `global/config/FirebaseConfig`는 `firebase.credentials-path`(local 기본값 `classpath:firebase-service-account.json`)가 없으면 경고만 남기고 앱은 정상 기동한다.
- **firebase-admin의 gzip 이중 디코딩 버그**: 이 프로젝트 의존성에 Apache HttpClient(4.5.14)가 함께 있으면 google-http-client가 자동 선택하는 `ApacheHttpTransport`가 응답을 두 번 압축 해제해 `send()`가 `ZipException: Not in GZIP format`으로 매번 실패한다. `FirebaseOptions.Builder.setHttpTransport(new NetHttpTransport())`로 transport를 명시해 우회했다.
- 프론트엔드 `firebase/firebaseConfig.ts`는 `Notification.requestPermission()` → `navigator.serviceWorker.register()` → **`navigator.serviceWorker.ready`로 active 상태를 기다린 뒤** `getToken()`을 호출한다. `register()` 직후 바로 `getToken()`을 부르면 서비스 워커가 아직 `installing`/`waiting` 상태라 `AbortError: no active Service Worker`가 난다.
- `public/firebase-messaging-sw.js`는 백그라운드(비활성 탭) 상태에서 온 메시지만 `onBackgroundMessage`로 알림을 띄운다. 탭이 포그라운드면 이 핸들러가 호출되지 않으므로, 현재 앱에는 포그라운드 알림 처리가 없다.
- 브라우저에서 알림 권한을 허용해도 macOS 시스템 설정(또는 Chrome 자체)에서 앱 알림이 꺼져 있으면 조용히 무시된다 — 실제 검증 중에도 이 설정 때문에 처음 두 번의 테스트 push가 보이지 않았다.
- Android/iOS 클라이언트 연동은 이 이슈 범위에서 제외했다(Android는 #29, iOS는 계정 확보 후 별도 이슈).

검증: 실제 Chrome 브라우저에서 `getToken()`으로 실제 FCM 토큰을 발급받고, 백엔드에서 `FirebaseMessaging.send()`로 그 토큰에 직접 테스트 메시지를 보내 다른 탭에 있는 상태에서 macOS 알림 수신까지 확인했다(DB/컨트롤러를 거치지 않은 최소 검증). `./gradlew test`, `npx tsc -b`, `npm run lint` 모두 통과.
