# 운영 백엔드 FCM 발송 자격증명 배포 (#199)

## 원인

실기기에서 FCM 알림이 오지 않았다. 원인은 안드로이드(수신) 쪽이 아니라
운영 백엔드(발송) 쪽이었다.

- [`FirebaseConfig.java`](../../backend/src/main/java/com/palisade/travel/global/config/FirebaseConfig.java)는
  `firebase.credentials-path`가 비어 있으면 `log.warn`만 남기고 Firebase Admin
  초기화를 건너뛴다.
- [`application-prod.yml`](../../backend/src/main/resources/application-prod.yml)의
  기본값이 `${FIREBASE_CREDENTIALS_PATH:}`(빈 문자열)인데, `backend-cd.yml`과
  `docker-compose.prod.yml` 어디에도 이 값을 채워주는 경로가 없었다.
- 결과적으로 [`PushNotificationService.sendToUser()`](../../backend/src/main/java/com/palisade/travel/domain/notification/service/PushNotificationService.java)가
  매번 `Firebase is not initialized; skip sending push`만 남기고 아무것도
  보내지 않았다. 안드로이드 앱의 수신 설정(`google-services.json`, 런타임 권한 요청,
  포그라운드 처리 등)은 모두 정상이었다 — 애초에 서버가 push를 쏘지 않았을 뿐이다.

`google-services.json`(안드로이드 **수신**용, #151에서 이미 해결)과 여기서 다루는
Firebase Admin 서비스 계정 JSON(백엔드 **발송**용)은 서로 다른 파일이라 혼동하기 쉽다.

## 수정

- `backend-cd.yml` deploy job에 `GOOGLE_SERVICES_JSON_BASE64` 복원 패턴과 동일한
  방식으로 `FIREBASE_SERVICE_ACCOUNT_BASE64` secret을 base64 디코드 →
  `~/app/firebase-service-account.json`로 복원, `project_id` 검증, 실패 시 배포 중단
  step을 추가했다.
- `docker-compose.prod.yml`에 그 파일을 `/run/secrets/firebase-service-account.json`로
  read-only mount하고 `FIREBASE_CREDENTIALS_PATH=file:/run/secrets/firebase-service-account.json`를
  설정했다. `file:` 프리픽스가 없으면 Spring `DefaultResourceLoader`가 파일 시스템이 아니라
  classpath 리소스로 해석한다.
- `FirebaseConfig`에 초기화 성공 로그(`Firebase Admin initialized from credentials-path=...`)를
  추가했다. 기존엔 실패/미설정만 로그로 남아서, 배포가 "초록불"이어도 실제로 초기화됐는지
  확인할 방법이 없었다.
- `backend-cd.yml`에 배포 후 컨테이너 로그에서 위 성공 로그를 폴링(최대 30초)하는
  검증 step을 추가했다. 성공 로그도 실패 로그도 못 찾으면 배포를 실패로 처리한다.
- 서비스 계정 원문 JSON은 checkout에도, Docker 이미지에도 포함되지 않는다 — EC2의
  `~/app` 아래 `chmod 600`으로만 존재하고, 컨테이너에는 read-only mount로만 전달된다.

## 검증

- `./gradlew compileJava`, `./gradlew test` 통과.
- `docker compose -f docker-compose.prod.yml config`로 compose 문법과 volume/env
  치환 결과 확인.
- `ruby -ryaml`로 `backend-cd.yml`/`docker-compose.prod.yml` 파싱 확인.
- 실제 EC2 배포와 실기기 push 수신 확인은 로컬에서 실행할 수 없어, `develop → main` 머지로
  `backend-cd.yml`이 트리거된 뒤 확인한다.
