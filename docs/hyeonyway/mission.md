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
