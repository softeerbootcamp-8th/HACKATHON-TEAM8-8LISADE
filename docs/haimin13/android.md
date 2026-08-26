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

# APK 배포 CD — GitHub Releases (#112)

QR코드를 다시 만들지 않고도 최신 APK가 내려가야 하므로, 배포처는 **버전이 바뀌어도 URL이 고정**되어야 한다. 처음에는 S3의 `app/latest.apk`를 덮어쓰는 방식으로 설계했으나 실제로는 불가능했다.

- 부트캠프 조직의 SCP(`arn:aws:organizations::652613583830:policy/...`)가 `s3:PutObject`를 **explicit deny**로 차단한다. SCP의 explicit deny는 IAM 정책이나 버킷 정책으로 덮을 수 없고, 같은 계정의 EC2 instance role로 우회해도 동일하게 걸린다(SCP는 principal이 아니라 계정 전체에 적용되는 가드레일이다). 버킷 생성과 공개 정책 적용은 통과했는데 `PutObject`만 막힌 것으로 보아 SCP가 허용 버킷 조건을 걸고 있는 것으로 추정된다.
- GitHub Releases로 전환했다. public repo에서 릴리즈 자산은 인증 없이 다운로드되고, `/releases/latest/download/<asset>`이 항상 최신 릴리즈로 해석된다. 실제 확인 결과 302 두 번(최신 릴리즈 → 서명된 CDN URL)을 거쳐 200이 내려오고, `content-type`은 `application/vnd.android.package-archive`로 GitHub이 확장자를 보고 정확히 붙여준다. S3에서 수동 지정하려던 헤더가 자동으로 해결됐다.
- 자산 파일명은 `8lisade.apk`로 **고정**한다. QR코드가 가리키는 URL의 일부이므로 버전을 붙이면 안 된다.
- 버전별 백업(`app/archive/`)과 캐시 무효화 처리는 릴리즈 히스토리와 GitHub CDN이 대신하므로 불필요해졌다.
- 하이픈이 있는(semver prerelease) 태그는 자동으로 prerelease로 표시해 `latest` URL을 갱신하지 않는다. 검증용 빌드가 실제 배포본을 덮어쓰지 않게 하기 위함이다.

빌드는 성공하지만 결과물이 쓸모없는 두 경우를 workflow에서 명시적으로 끊는다. 둘 다 CI 초록불 뒤에 숨는 실패다.

- `VITE_API_BASE_URL` 누락 — `apiUrl()`이 상대경로를 반환하고, Capacitor WebView는 origin이 `localhost`라 그 요청이 앱 자신을 가리킨다. 설치된 앱의 모든 API 호출이 실패한다. 번들을 grep해 주소가 없으면 실패시킨다.
- 서명 누락 — gradle이 `app-release-unsigned.apk`를 만들고 빌드는 성공하지만 기기에 설치할 수 없다. 파일 존재를 확인하고 `apksigner verify`로 검증한다.

`versionCode`는 태그 버전과 별개로 단조 증가해야 하므로 `github.run_number`를 쓴다.

검증: `v0.0.2` 태그로 실제 릴리즈해 고정 URL에서 익명 다운로드까지 확인했다. 내려받은 APK의 서명(`CN=8lisade`), 주입된 버전(`versionCode='2' versionName='0.0.2'`), 번들의 API 주소를 모두 확인했고 실기기 다운로드도 확인했다.
