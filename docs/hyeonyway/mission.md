# Mission domain

## Issue #12 — mission submission and attendance PIN

- `Mission` supports only `ACTIVITY` (photo) and `CHECK` (four-digit PIN). Check missions receive a server-generated PIN; only the trip owner can read it.
- Student mission endpoints only return missions whose `startAt` has passed. A waiting photo submission is represented as `EXPIRED` after `endAt` without mutating state during reads.
- Photo flow is `POST /api/missions/{missionId}/photo-upload` → direct upload → `POST /api/missions/{missionId}/submissions/photo` with the returned `objectKey`. The server persists only that key, not image bytes. A successful photo submission is immediately `COMPLETED`; a teacher can later reject it, after which a replacement upload is also immediately completed.
- `StoragePresigner` is the S3 boundary. 운영 `prod` 프로필은 AWS SDK `S3Presigner`와 `DefaultCredentialsProvider`를 사용하므로 EC2 IAM Role의 임시 자격 증명을 자동으로 사용한다. `S3_BUCKET`, `AWS_REGION`만 설정하며 access key/secret은 저장하지 않는다.
- The frontend uses the session cookie and CSRF token for student current-mission lookup and PIN/photo submission. It uploads the captured image directly to the returned Presigned URL before it sends the opaque object key back to the application server.

## Issue #12 — local mock storage and S3 presigner

- `local`과 `test` 프로필은 `LocalStoragePresigner`가 `PUT /mock-storage/**` URL을 반환하고, local 전용 controller가 204로 응답한다. 따라서 S3 설정 없이도 프론트의 업로드 → objectKey 제출 흐름을 확인할 수 있다.
- `prod`에서는 5분 유효한 JPEG PUT Presigned URL을 발급한다. AWS SDK 기본 자격 증명 체인이 EC2 IAM Role을 사용하며, 버킷은 `S3_BUCKET`, 리전은 `AWS_REGION`(기본 `ap-northeast-2`)에서 읽는다.

검증: `./gradlew test`, `./gradlew build`

## Issue #27 — Capacitor Camera·Presigned URL 사진 제출

- `@capacitor/camera`로 앨범 선택 없이 후면 카메라만 열고, 반환된 `webPath`를 사진 확인·S3 PUT에 사용하는 `cameraAdapter`를 추가했다.
- 카메라 Activity 실행 직전에 현재 활동 미션 메타데이터만 Capacitor Preferences에 저장한다. Android가 앱을 종료했다가 `appRestoredResult`로 카메라 결과를 전달하면, 저장된 미션과 사진 URI로 사진 확인 화면을 복구한다. 제출 성공 뒤에는 임시 메타데이터를 즉시 삭제한다.
- `@capacitor/app`, `@capacitor/preferences`, `@capacitor/camera`를 Android 프로젝트에 sync했다. 사진 제출은 기존 `POST photo-upload` → Presigned URL PUT → objectKey 제출 흐름을 그대로 이용한다.
- EC2 Role이 허용한 `upload/*` 정책과 일치하도록 서버 발급·제출 검증 object key를 `upload/missions/{missionId}/students/{studentId}/...`로 통일했다.

검증: `npm test`(128개), `npm run lint`, `npm run build`, `./gradlew test`, `npx cap sync android`

## 학생 사진 확인 화면 실사진 표시 (#27 후속)

- `ActivityConfirmation`(`StudentScreens.tsx`)이 `photoUri` prop을 텍스트로만 출력하고 `<img>`는 고정 `preview-placeholder.svg`를 렌더링하던 버그를 고쳤다. `<img src={photoUri}>`로 바꾸고, 이제 사진으로 대체된 텍스트 줄은 제거했다. Figma `S-04-1 활동 미션 제출`(fileKey `Gp5SdtjYGtXq3UJ9qk4ZTZ`, node `82:582`)이 큰 사진 미리보기를 요구하는 걸 확인하고 진행했다.
- `alt=""` + `aria-label`은 `<img alt="">`가 접근성 트리에서 presentation role로 취급돼 `aria-label`이 무시된다(`getByRole('img', {name})`으로 못 찾음) — 의미 있는 사진이므로 `alt="촬영한 사진 미리보기"`로 바꿔 접근성 이름을 실제로 노출시켰다.
- 같이 정리: `missionApi.ts`의 미사용 `MissionApi` interface(#27 설계 문서가 언급한 이름이지만 실제 구현체는 다른 이름으로 나가서 orphan됨) 제거.

검증: `npm test`(신규 `StudentScreens.test.tsx` 포함 34파일 199개 통과), `npm run lint`, `npm run build` 모두 통과.

## 사진 업로드 Content-Type 서명 불일치 수정 (#132)

- 운영 배포 후 실제 카메라로 촬영한 PNG 사진을 제출하니 S3 PUT이 403 `SignatureDoesNotMatch`로 실패했다. `S3StoragePresigner.presignPut`이 presigned URL을 항상 `Content-Type: image/jpeg`로 서명하는데, `uploadToStorage`는 `photo.type || 'image/jpeg'`로 실제 Blob의 MIME 타입을 그대로 헤더에 보내고 있었다 — 캡처 결과가 `image/jpeg`가 아니면(웹 파일 선택 등에서 흔함) SigV4 서명 검증이 어긋난다.
- 403 응답의 `CanonicalRequest`에 `content-type:image/png`가 실제로 찍혀 있어 원인을 바로 특정했다.
- `uploadToStorage`가 Blob의 실제 타입과 무관하게 항상 `image/jpeg`로 고정해서 보내도록 수정했다(백엔드가 항상 그 값으로 서명하므로).

검증: `npm test`(신규 케이스 포함 37파일 222개 통과), `npm run lint`, `npm run build` 모두 통과.

## 사진 업로드 실제 Content-Type 정식 지원 (#135)

- #132의 "무조건 image/jpeg로 라벨링" 임시조치를 되돌리고, 실제 지원 형식을 정식으로 다뤘다. 웹 카메라 폴백이 진짜 PNG를 캡처하는 경로가 `@capacitor/camera`의 web 구현에 실제로 존재해서(`file.type === 'image/png'` 분기), S3에 잘못된 Content-Type 메타데이터를 저장하는 문제가 있었다.
- `StoragePresigner.presignPut(objectKey, contentType)`으로 시그니처를 바꿔 `S3StoragePresigner`가 실제 넘어온 값으로 서명하도록 했다. `LocalStoragePresigner`는 로컬 mock이라 값 자체는 안 쓰지만 인터페이스는 맞춘다.
- `POST /api/missions/{missionId}/photo-upload`에 `contentType` 요청 필드를 추가하고 `@Pattern(regexp = "image/jpeg|image/png")`로 허용 목록 밖 값을 400 `VALIDATION_ERROR`로 거부한다.
- S3 object key 확장자를 실제 타입에 맞춰 생성한다(`image/png` → `.png`, 그 외 → `.jpg`).
- 프론트 `missionApi.ts`는 캡처된 Blob의 `type`이 지원 목록(`image/jpeg`, `image/png`)에 있으면 그대로, 아니면 `image/jpeg`로 정규화해서 `/photo-upload` 요청 본문과 실제 S3 PUT 헤더 양쪽에 동일한 값을 쓴다(요청 한 번에 한 값만 계산해 재사용 — 두 곳에서 따로 판정하다 어긋나는 걸 방지).

검증: 백엔드 `./gradlew build`(전체 통과, presigner 2종 + `MissionServiceTest` + 신규 `PhotoUploadPrepareRequestTest` 포함), 프론트 `npm test`(신규 케이스 포함 37파일 224개), `npm run lint`, `npm run build` 모두 통과. 로컬 백엔드를 직접 띄우고 curl로 `contentType: image/png` → objectKey가 `.png`로 발급되는 것과 `image/webp` → 400 거부를 실제로 확인했다.

## 웹 카메라 촬영이 실제 카메라 뷰를 쓰도록 pwa-elements 등록 (#145)

- #135에서 jpeg/png 외 형식(HEIC, WEBP, GIF 등)이 왜 올라올 수 있는지 추적하다가 근본 원인을 찾았다: `@ionic/pwa-elements`가 설치돼 있지 않아 Capacitor Camera가 웹에서 `<pwa-camera-modal>` 커스텀 엘리먼트를 못 찾고, 즉시(등록 여부만 확인하고) `accept` 속성도 없는 일반 `<input type=file>`로 폴백하고 있었다 — 즉 웹에서는 "카메라 촬영"이 아니라 사실상 기기의 아무 파일이나 고를 수 있는 상태였다.
- `@ionic/pwa-elements`를 설치하고 `main.tsx`에서 `defineCustomElements(window)`를 호출해 등록했다. 이제 Capacitor Camera가 모달 존재를 확인하고 실제 `getUserMedia` 기반 라이브 카메라 뷰로 진입한다.
- 브라우저로 직접 확인: 카메라 하드웨어가 없는 환경(이 개발 환경)에서는 모달이 "No camera found" 메시지와 "Choose image" 버튼을 명확히 보여주고(기존처럼 조용히 파일 선택창으로 새지 않음), 카메라 있는 환경에서는 라이브 뷰가 뜬다. 취소 시 앱은 깨지지 않고 원래 촬영 화면으로 돌아간다(다만 취소 자체에 대한 사용자 안내는 없음 — 별도 후속 작업으로 분리).
- 네이티브 Android/iOS 빌드는 이미 실제 네이티브 카메라 API를 쓰므로 이 변경과 무관하다.

검증: `npm test`(37파일 225개 통과), `npm run lint`, `npm run build` 모두 통과. 로컬 백엔드+프론트를 직접 띄우고 학생 계정으로 로그인해 실제 미션 촬영 화면에서 셔터를 눌러 pwa-camera-modal이 뜨는 것과 "No camera found" 처리, 취소 후 정상 복귀를 브라우저로 직접 확인했다.

## 미션 수동 완료 처리 (#168)

- 마감(`endAt`)이 지나도 미션이 "진행중"으로 계속 표시되고, 교사가 직접 종료할 방법이 없던 문제를 해결했다. `Mission`에 `completedAt`(nullable) 필드와 `complete()`/`isCompleted()`를 추가했다 — 별도 status enum 대신 시각 필드로 완료 여부를 표현한다.
- `POST /api/teacher/missions/{missionId}/complete`(`MissionService.complete`)를 추가했다. 담당 교사만 호출 가능하고, 이미 완료된 미션을 다시 완료 처리하면 `MISSION_ALREADY_COMPLETED`로 거부한다.
- 완료된 미션은 학생이 더 이상 접근할 수 없다 — 기존 `requireAccessible()`(제출/PIN 검증/사진 presign이 모두 거치는 단일 지점)에 `mission.isCompleted()` 체크를 추가해 한 곳 수정으로 전부 막았다. `getCurrentStudentMissions`도 완료된 미션을 목록에서 제외한다.
- `MissionResponse`에 `completedAt`을 실어 프론트에 노출한다.
- 프론트: `missionDispatchStatus`가 `완료` 상태를 추가로 반환하고(대기/진행중/완료 3종), 리스트·현황판 뱃지에 반영된다. `MissionStatusScreen`에 "완료 처리하기" 버튼 + 확인 모달(기존 삭제하기 확인 패턴과 동일한 2단계 확인 UX)을 추가했다. 완료된 미션에서는 "완료 처리하기", "대리 완료", "반려" 버튼이 모두 사라진다(읽기 전용 현황판).
- 자료 내보내기, 마감 시각 기준 자동 완료 전환은 이번 범위에서 다루지 않는다.

검증: 백엔드 `MissionServiceTest`에 4개 케이스 추가(수동 완료, 중복 완료 거부, 완료된 미션 학생 접근 차단, 완료된 미션이 학생 현재 미션 목록에서 제외) 후 `./gradlew test` 전체 통과. 프론트 `TeacherMissions.test.tsx`에 완료 처리 플로우 테스트 추가 후 `npm test`(41파일 256개), `npm run lint` 모두 통과.

## 반려된 미션 제출 이미지 S3 삭제 (#172)

- 교사가 사진 제출을 반려해도 `MissionService.reject()`는 상태만 `REJECTED`로 바꾸고 S3 object는 그대로 방치됐다. 재제출(`resubmit`) 시에도 DB의 `imageKey`만 새 값으로 덮어써서, 반려된 이전 이미지는 버킷에 영구히 고아로 남아 있었다.
- `StoragePresigner`에 `deleteObject(String objectKey)`를 추가했다. `S3StoragePresigner`는 새로 주입받은 `S3Client`(presigner와 별개, 실제 delete 호출용)로 `DeleteObjectRequest`를 실행한다. `S3Exception`은 잡아서 로그만 남기고 삼킨다 — 반려는 DB 상태 변경이 핵심이고 S3 정리는 부가 작업이므로, 삭제 실패가 반려 트랜잭션 자체를 막으면 안 된다. `LocalStoragePresigner`는 no-op.
- `S3PresignerConfig`에 `S3Client` 빈을 추가했다(`DefaultCredentialsProvider` 재사용, 기존 `S3Presigner`와 동일한 자격 증명 체인).
- `MissionService.reject()`에서 `submission.reject(reason)` 직후 `imageKey`가 비어있지 않을 때만(`CHECK` 미션은 imageKey가 빈 문자열) `deleteObject`를 호출한다.

검증: `./gradlew test`(`S3StoragePresignerTest`에 delete 성공/예외 삼킴 케이스 추가, `MissionServiceTest`에 반려 시 삭제 호출/미호출 케이스 추가), `./gradlew build` 모두 통과.

## 완료한 미션이 현재 미션 목록에 계속 남던 버그 수정 (#176)

- 원인은 두 가지였다.
  1. `MissionService.getCurrentStudentMissions()`가 `Mission.isAccessibleAt(now)`만 필터링하고, 해당 학생이 이미 제출했는지(`MissionSubmission.status == COMPLETED`)는 전혀 확인하지 않았다. 사진 제출·PIN 인증 모두 성공 시 즉시 `COMPLETED`로 저장되는데, `/api/trips/{tripId}/missions/current`가 이를 무시하고 트립의 접근 가능한 미션을 그대로 반환해서, 새로고침·재로그인·20초 폴링마다 이미 완료한 미션이 다시 나타났다.
  2. 프론트 `App.tsx`에서 출석체크(`CHECK_MISSION`) 완료 콜백이 `setCurrentMission(null)`로 무조건 초기화했다. 사진 미션 제출 콜백은 로컬에 캐시해 둔 `availableMissions` 배열에서 다음 미션을 찾아 넘어갔는데(그마저도 3개 이상 미션이 연쇄될 때는 stale 배열 때문에 이미 끝낸 미션으로 되돌아갈 수 있는 잠재 결함이 있었다), 출석체크는 이 로직조차 없었다.
- 백엔드: `MissionSubmissionRepository`에 `findByMissionIdInAndUserId(missionIds, userId)`를 추가하고, `getCurrentStudentMissions`가 접근 가능한 미션 중 이 학생이 `COMPLETED`로 제출한 것만 제외하도록 했다. `REJECTED`는 그대로 남겨 재제출이 가능하다.
- 프론트: 사진 제출·PIN 인증 콜백 둘 다 로컬 배열을 뒤지는 대신 기존에 있던 `loadCurrentMission(tripId)`(알림 딥링크 처리에서 이미 쓰던 함수)를 다시 호출해 서버에서 최신 목록을 받아오도록 통일했다. 이제 백엔드가 완료된 미션을 걸러주므로, 프론트는 단순히 다시 물어보기만 하면 되고 "다음 미션이 뭔지" 스스로 추론할 필요가 없다 — 위 잠재 결함도 이 통일로 함께 없어졌다. 더 이상 아무도 읽지 않는 `availableMissions` state는 제거했다.

검증: 백엔드 `MissionServiceTest`에 2개 케이스 추가(완료한 미션 제외, 반려된 미션은 재제출 가능하도록 유지) 후 `./gradlew test` 전체 통과. 프론트 `App.test.tsx`에 출석체크 완료 후 다음 미션으로 전환되는 회귀 테스트 1개 추가, 기존 3개 테스트는 완료 후 재조회 결과를 모킹하도록 갱신 후 `npm test`(41파일 256개), `npm run lint`, `npx tsc -b --noEmit` 모두 통과.

## 활동 미션 촬영 화면 삭제 — 카메라 바로 진입 (#202)

- Figma S-04-1은 미션 진입 시 바로 카메라로 들어가야 하는데, `ActivityMissionScreen`이 뷰파인더 목업 이미지 + "촬영하기" 셔터 버튼이 있는 중간 화면을 먼저 보여주고 학생이 그 버튼을 눌러야 `captureMissionPhoto`가 호출되던 문제를 고쳤다.
- 처음에는 `ActivityMissionScreen`을 남겨두고 마운트 시 자동으로 캡처를 호출하는 방향으로 구현했으나, 이슈 작성자가 "CHECK 미션이 `CheckMissionScreen`으로 바로 들어가는 것처럼, ACTIVITY 미션도 화면 자체 없이 바로 캡처를 호출해야 한다"고 방향을 정정해 최종적으로는 그 방향으로 다시 구현했다.
- `App.tsx`에 `captureActivityMission(mission)`을 추가해 `captureMissionPhoto`를 직접 호출한다. "현재 미션 수행" 클릭, 알림 딥링크, 사진 확인 화면의 "재촬영하기"가 모두 이 함수 하나를 공유한다. 성공하면 `ACTIVITY_CONFIRMATION`으로 전환하고, 실패/취소 시에는 화면 전환 없이 학생 홈에 남아 오류 문구만 보여준다(재촬영 실패 시에도 기존 사진 확인 화면에 그대로 머문다).
- 더 이상 라우팅되지 않는 `ActivityMissionScreen` 컴포넌트, 전용 화면 값 `'ACTIVITY_MISSION'`(`features/app/appFlow.ts`의 `Screen` 유니언), 그 화면에서만 쓰이던 `assets/icons/viewfinder.svg`를 함께 제거했다(`.viewfinder-wrap` CSS 클래스 자체는 `ActivityConfirmation`의 사진 미리보기가 계속 쓰므로 유지).
- 반려 재제출 안내 문구("반려 사유를 확인하고 다시 촬영해 주세요." / "사진이 흐릿합니다...")는 기존에 `ActivityMissionScreen`에만 있었는데, 그 화면 자체가 없어지면서 대체할 곳 없이 함께 제거됐다 — 토스트 등 새 알림 수단을 이 이슈 범위에서 새로 만들지는 않기로 했다(이슈 작성자 확인). `isResubmission` 플래그는 `App.tsx`에서 항상 `false`로만 채워지고 있어(`loadCurrentMission`) 실제로는 아직 트리거되지 않는 상태이기도 하다.
- Figma MCP를 이번 세션에 연결할 수 없어 픽셀 단위 비교는 생략하고, 이슈에 적힌 요구사항 문구를 기준으로 판단했다.

검증: `npm test`(42파일 279개 통과), `npm run lint`, `npm run build` 모두 통과.

## 학생 상세 미션 현황 및 Figma 레이아웃 (#180)

- `TeacherStudents`의 학생 상세를 Figma T-04-1 구조(상단 뒤로가기, 학생 정보 카드, 위치 placeholder, 미션 현황 행)로 구성했다. 전화번호 API가 아직 없으므로 학생/학부모 `전화 걸기` 버튼은 비활성 UI만 제공하며 `tel:` 연결이나 번호 표시는 하지 않는다.
- 기존 교사 미션 목록과 미션별 status-board 응답을 재사용해, 대상 학생이 제출자이면 `제출` 또는 `지각`, 미제출이면 미션 마감/완료 여부에 따라 `미제출` 또는 `진행 중` 배지를 표시한다. 새 API는 추가하지 않았다.
- `MANUAL` 참가자는 `userId`가 없어 status-board와 연결할 수 없으므로 위치 미추적 안내만 보여 주고 미션 목록은 생략한다.

검증: 프런트 `npm test`(41파일 259개), `npm run build` 통과.

## 미션 종류 태그 색깔 미반영 수정 (#204)

- `TeacherMissions.tsx`의 미션 리스트 카드가 `mission.type` 값과 무관하게 항상 `badge badge-type` 하나만 렌더링해, "활동"과 "출석 체크" 태그가 항상 같은 회색(`#eef1f7`/`#556`)으로 보이던 버그를 고쳤다.
- `missionStatusBadgeClass`와 같은 패턴으로 `missionTypeBadgeClass(type)`를 추가해 `ACTIVITY` → `badge-type--activity`, `CHECK` → `badge-type--check` 클래스를 부여한다.
- 이번 세션에는 Figma MCP 연결이 끊겨 있어 시안의 실제 색상 값을 조회하지 못했다. 대신 `index.css`에 이미 있는 두 가지 톤을 재사용했다: `badge-type--activity`는 `.upcoming-trip-badge`와 같은 계열의 앰버(연한 배경 `var(--color-accent-soft)` + 텍스트 `#a16207`), `badge-type--check`는 이 앱에 아직 없던 청색 계열(연한 배경 `rgb(59 130 246 / 12%)` + 텍스트 `#3b5bdb`)을 새로 추가했다. 둘 다 옆의 상태 배지(`badge-status-active`의 초록, `noti-badge`류의 빨강/주황)와 색이 겹치지 않도록 골랐다. 실제 Figma 값과 다를 수 있으므로 디자인 확인 시 재조정이 필요하다.

검증: 프런트 `npx vitest run`(42파일 279개), `npm run lint`, `npm run build` 모두 통과.
