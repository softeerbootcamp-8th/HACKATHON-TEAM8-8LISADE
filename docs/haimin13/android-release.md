# release APK에 google-services.json이 없어 로그인 시 앱 크래시 (#151)

## 원인

`frontend/android/app/google-services.json`은 [`.gitignore:48`](../../.gitignore)에 등록되어 있어 repository에 존재하지 않는다. [`android-cd.yml`](../../.github/workflows/android-cd.yml)은 checkout 후 이 파일을 복원하지 않았다 — `VITE_FIREBASE_*` secret을 주입하지만 그건 웹 Firebase JS SDK용이라 네이티브 FCM을 대신하지 못한다.

[`build.gradle`](../../frontend/android/app/build.gradle)의 Capacitor 기본 블록은 파일이 없으면 `try/catch`로 google-services Gradle 플러그인 적용을 건너뛰고 **빌드를 성공시켰다.** 그래서 CD가 초록불로 통과했고, `google_app_id` 리소스가 없는 APK가 배포됐다. 로컬에는 파일이 있어 debug 빌드는 정상이었고, 결함은 배포된 APK에서만 드러났다.

크래시 체인:

1. 로그인 → `App.enterAuthenticatedUser` → `registerPushNotifications()` → `nativeFcm.requestToken()`
2. 알림 권한 팝업 응답 후 `PushNotifications.register()` 호출
3. Capacitor `PushNotificationsPlugin.register()`의 `FirebaseMessaging.getInstance()`가 `IllegalStateException: Default FirebaseApp is not initialized in this process` 발생
4. Capacitor `Bridge.callPluginMethod`가 이 예외를 삼키지 않고 `throw new RuntimeException(ex)`로 다시 던진다
5. 해당 `Runnable`은 메인 루퍼에 post된 것이라 uncaught → 프로세스 즉사

JS의 `.catch(() => undefined)`로는 막을 수 없다. 예외가 네이티브 메인 스레드에서 터지기 때문에 WebView 쪽에는 도달할 기회조차 없다. 로그아웃 경로(`PushNotifications.unregister()`)도 같은 `FirebaseMessaging.getInstance()` 호출이라 동일하게 죽는다.

## 수정

- `android-cd.yml`에 `GOOGLE_SERVICES_JSON_BASE64` secret을 `frontend/android/app/google-services.json`으로 복원하는 step을 추가했다. keystore와 같은 패턴이고, 빈 파일과 `package_name` 불일치를 함께 검증한다 — secret을 잘못 넣는 것도 같은 종류의 조용한 실패이기 때문이다.
- 빌드 후 `app/build/generated/res/processReleaseGoogleServices/values/values.xml`에 `google_app_id`가 있는지 확인하는 step을 추가했다. 기존 "Verify API base URL is embedded"와 같은 성격의 방어다.
- `build.gradle`의 조용한 skip을 release 빌드에서만 `GradleException`으로 바꿨다. `gradle.taskGraph.whenReady`에서 이 프로젝트의 `(assemble|bundle)Release*` 태스크가 그래프에 있는지 보고 끊는다. 로컬 개발과 `android-ci.yml`(assembleDebug)은 파일 없이 그대로 동작해야 하므로 debug 경로는 경고만 남긴다.

프론트 코드는 손대지 않았다. 이 크래시는 JS에서 방어할 수 있는 종류가 아니고, 근본 원인이 빌드 파이프라인에 있다.

## 검증

로컬에서 세 경로를 모두 실행해 확인했다.

- `google-services.json` 없이 `./gradlew :app:assembleRelease --dry-run` → 의도한 메시지와 함께 BUILD FAILED
- `google-services.json` 없이 `./gradlew :app:assembleDebug --dry-run` → 경고만 남기고 BUILD SUCCESSFUL
- 파일 복원 후 `./gradlew :app:assembleRelease` → BUILD SUCCESSFUL

CD 검증 step이 참조할 생성 경로는 실제 release 빌드 산출물로 확인했다. 처음 작성한 `generated/res/google-services/release/values/values.xml`은 존재하지 않았고, 실제 경로는 `generated/res/processReleaseGoogleServices/values/values.xml`이었다.

## 남은 수동 작업

`GOOGLE_SERVICES_JSON_BASE64` repository secret 등록이 필요하다. 등록 전까지 release 빌드는 **의도적으로 실패한다** — 크래시하는 APK가 배포되는 것보다 낫다.

```
base64 -i frontend/android/app/google-services.json | pbcopy
```

## 참고

v0.0.2는 `main`이 아니라 `10b10cc`(infra/#112 브랜치)에서 workflow_dispatch로 빌드됐고 당시 develop보다 뒤쳐진 스냅샷이었다. 이번 크래시의 원인은 아니지만 릴리즈 추적성 문제로 따로 볼 필요가 있다. `FOREGROUND_SERVICE_LOCATION` 매니페스트 설정과 `minifyEnabled false`는 확인 결과 정상이며 무관하다.
