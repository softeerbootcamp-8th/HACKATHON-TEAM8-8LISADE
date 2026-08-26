# Android 뒤로가기 시 백그라운드 전환 (#107)

- Capacitor의 `BridgeActivity`(`@capacitor/android`)는 뒤로가기를 자체적으로 처리하지 않는다 — `Bridge`/`BridgeActivity` 소스를 확인해보니 `OnBackPressedCallback` 등록이 전혀 없다. 즉 지금까지는 시스템 기본 동작(WebView 히스토리가 없으면 액티비티 `finish()`, 곧 프로세스 종료)이 그대로 적용되고 있었다.
- `targetSdkVersion 36`이라 예측형 뒤로가기 제스처가 기본 활성화된 상태다. deprecated된 `Activity.onBackPressed()` 오버라이드 대신 `getOnBackPressedDispatcher().addCallback()`(androidx.activity)로 등록해야 한다.
- `MainActivity`에 콜백을 추가해 `bridge.getWebView().canGoBack()`이면 웹뷰 히스토리를 pop하고, 아니면 `finish()` 대신 `moveTaskToBack(true)`를 호출한다. SPA 내부 뒤로가기 동작은 그대로 둔다.

검증: Pixel 8 API 36 (Google Play) 에뮬레이터에 debug APK를 설치해 실제로 확인했다. 앱 실행 후 뒤로가기 → 런처로 전환되고 `adb shell ps -A`에 `com.softeerbootcamp.eightlisade` 프로세스가 15초 뒤에도 살아있음을 확인. 첫 시도에서는 프로세스가 사라졌는데, logcat에 `Killing ... depends on provider com.google.android.gms/.fonts.provider.FontsProvider in dying proc com.google.android.gms.persistent`가 찍혀 있어 원인이 우리 코드가 아니라 갓 부팅한 에뮬레이터의 GMS 프로세스 크래시였음을 확인했다(GMS 안정화 후 재시도해 재현 안 됨). `./gradlew compileDebugJavaWithJavac`, `./gradlew testDebugUnitTest` 통과.

# Android release 서명 빌드 구성 (#118)

- `buildTypes.release`에 `signingConfig`가 없어서 `assembleRelease`가 미서명 APK만 뱉고 있었다. 서명 없는 APK는 기기에 설치되지 않으므로 배포(#112)의 선결 조건이었다.
- 서명 정보를 소스에 두지 않기 위해 `app/build.gradle`에 `resolveSigningValue(property, env)` helper를 두고 **gradle property 우선 → 환경변수 fallback**으로 해석한다. keystore 경로/비밀번호/alias/key 비밀번호 네 값이 모두 있고 `file(path).exists()`일 때만 `signingConfigs.release`를 구성하고, 하나라도 없으면 `signingConfig`를 지정하지 않는다. 조건부로 만든 이유는 로컬 개발자와 기존 CI(`assembleDebug`)가 keystore 없이도 그대로 빌드돼야 하기 때문이다.
- 미주입 시 `logger.lifecycle`로 경고를 남긴다. 서명이 조용히 빠지면 배포 후에야 발견되기 때문이다.
- `versionCode 1` / `versionName "1.0"` 하드코딩도 같은 helper로 주입받게 바꿨다(기본값 유지). CD에서 태그 버전과 `github.run_number`를 넣기 위함이다.
- **서명 여부에 따라 산출물 파일명이 달라진다**: 서명 시 `app-release.apk`, 미서명 시 `app-release-unsigned.apk`. #112의 workflow는 glob으로 양쪽을 받아야 한다.
- `frontend/android/.gitignore`의 `*.jks`/`*.keystore`는 주석 처리된 상태였고, 그나마도 해당 하위 디렉터리에만 적용된다. repository root에 keystore를 두면 전혀 막히지 않으므로 root `.gitignore`에도 `*.jks`, `*.keystore`, `*.p12`, `keystore.properties`를 추가했다. keystore 원본은 repository 밖에 두고 경로를 주입하는 것이 원칙이며 이 규칙은 안전장치다.

검증: 일회용 keystore로 `assembleRelease` → `apksigner verify`로 서명 확인, `aapt2 dump badging`으로 `versionCode='42' versionName='1.2.3'` 주입 확인. 미주입 상태에서는 `app-release-unsigned.apk`가 나오고 빌드는 성공. 기존 CI 경로 `testDebugUnitTest assembleDebug` 통과. 팀 실제 keystore로도 서명된 `app-release.apk` 생성을 확인했다.

주의: `~/.gradle/gradle.properties`에 비밀번호를 넣는 경우, Gradle은 이 파일을 ISO-8859-1로 읽기 때문에 비ASCII 문자가 포함되면 값이 깨져 `keystore password was incorrect`가 발생한다. 그런 비밀번호는 `-P` 옵션이나 환경변수로 넘겨야 한다.
