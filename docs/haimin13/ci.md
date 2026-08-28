# Android CI paths 필터 복원 (#89)

- Capacitor Android 프로젝트 설정 커밋(`e2f2667`)에서 [`.github/workflows/android-ci.yml`](../../.github/workflows/android-ci.yml)의 `changes` job 경로 필터가 `frontend/android/**`에서 `frontend/**`로 넓어져 있었다. 그 결과 웹(React) 코드만 바뀌어도 develop PR마다 무거운 Android Gradle 빌드(`testDebugUnitTest assembleDebug`)가 매번 실행되고 있었다.
- Capacitor는 `cap sync`로 이미 빌드된 웹 정적 파일을 그대로 네이티브 프로젝트에 복사하는 구조라, 웹 빌드가 성공하면 APK 패키징도 거의 항상 성공한다. 웹 로직 자체의 정합성은 frontend-ci(lint/test/build)가 이미 담당하므로, android-ci는 네이티브 래핑(Gradle 설정, 플러그인, 네이티브 코드)이 깨졌는지만 검증하는 역할로 되돌렸다.
- 필터를 `frontend/android/**`로 좁히는 한 줄만 되돌렸다. iOS CI(`ios-ci.yml`)는 이미 `frontend/ios/**`로 좁혀져 있어 영향 없었다.

검증: `ruby -ryaml -e 'YAML.load_file(".github/workflows/android-ci.yml")'`로 YAML 문법 확인. GitHub Actions 트리거 특성상 실제 "develop PR에서 웹 코드만 바꿨을 때 스킵되는지"는 다음 PR에서 확인 필요.

# backend-cd Firebase 초기화 확인 대기 시간 확장 (#255)

- [`.github/workflows/backend-cd.yml`](../../.github/workflows/backend-cd.yml)의 `Verify Firebase Admin initialized` 스텝이 `logs/travel.log`를 최대 15회(`seq 1 15`), 매 회 사이 `sleep 2`로 폴링해서 총 대기 시간이 약 28~30초였다. 컨테이너가 정상 기동했지만 로그가 이 짧은 창을 넘겨서 찍히는 경우 배포가 오탐 실패 처리되는 문제가 있었다(#213 관련 이력).
- 로그를 찾으면 즉시 `exit 0`으로 성공 처리하는 기존 로직은 그대로 두고, 재시도 횟수만 `seq 1 15` → `seq 1 30`으로 늘려 최대 대기 시간을 약 60초로 확장했다. 실패 시 출력하는 안내 메시지("15회 시도 후에도...")도 "30회 시도 후에도..."로 함께 갱신했다.

검증: `ruby -ryaml -e "YAML.load_file('.github/workflows/backend-cd.yml')"`로 YAML 문법 확인. SSH로 실제 EC2에 배포해 로그 감지 타이밍을 재현하는 검증은 워크플로 특성상 로컬에서 불가능해 다음 실제 배포에서 확인 필요.
