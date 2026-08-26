# Android 뒤로가기 시 백그라운드 전환 (#107)

- Capacitor의 `BridgeActivity`(`@capacitor/android`)는 뒤로가기를 자체적으로 처리하지 않는다 — `Bridge`/`BridgeActivity` 소스를 확인해보니 `OnBackPressedCallback` 등록이 전혀 없다. 즉 지금까지는 시스템 기본 동작(WebView 히스토리가 없으면 액티비티 `finish()`, 곧 프로세스 종료)이 그대로 적용되고 있었다.
- `targetSdkVersion 36`이라 예측형 뒤로가기 제스처가 기본 활성화된 상태다. deprecated된 `Activity.onBackPressed()` 오버라이드 대신 `getOnBackPressedDispatcher().addCallback()`(androidx.activity)로 등록해야 한다.
- `MainActivity`에 콜백을 추가해 `bridge.getWebView().canGoBack()`이면 웹뷰 히스토리를 pop하고, 아니면 `finish()` 대신 `moveTaskToBack(true)`를 호출한다. SPA 내부 뒤로가기 동작은 그대로 둔다.

검증: Pixel 8 API 36 (Google Play) 에뮬레이터에 debug APK를 설치해 실제로 확인했다. 앱 실행 후 뒤로가기 → 런처로 전환되고 `adb shell ps -A`에 `com.softeerbootcamp.eightlisade` 프로세스가 15초 뒤에도 살아있음을 확인. 첫 시도에서는 프로세스가 사라졌는데, logcat에 `Killing ... depends on provider com.google.android.gms/.fonts.provider.FontsProvider in dying proc com.google.android.gms.persistent`가 찍혀 있어 원인이 우리 코드가 아니라 갓 부팅한 에뮬레이터의 GMS 프로세스 크래시였음을 확인했다(GMS 안정화 후 재시도해 재현 안 됨). `./gradlew compileDebugJavaWithJavac`, `./gradlew testDebugUnitTest` 통과.
