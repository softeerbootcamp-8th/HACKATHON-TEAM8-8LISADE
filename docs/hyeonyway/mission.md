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
