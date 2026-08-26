# 미션 사진 촬영 시 갤러리 선택 지원 (#235)

미션 사진 촬영이 `Camera.takePhoto()`(카메라 전용, Capacitor 8에서 갤러리
옵션이 없는 API로 분리됨)로 강제돼 있어서, 카메라가 없는 환경(시연 장소 등)
에서는 활동(ACTIVITY) 미션을 아예 수행할 수 없었다.

deprecated된 `Camera.getPhoto()` + `CameraSource.Prompt` 대신, 앱에서 직접
만든 `PhotoSourceDialog`로 "카메라로 촬영"/"갤러리에서 선택" 중 고르게 하고,
고른 쪽에 맞춰 non-deprecated API인 `Camera.takePhoto()` /
`Camera.chooseFromGallery()`를 호출한다.

- `cameraAdapter.pickFromGallery()` — `Camera.chooseFromGallery()`로 사진
  1장을 골라 기존 `takePhoto()`와 같은 `{ uri }` 형태로 반환한다.
- `captureMissionPhoto(mission, source)` — `source`가 `'gallery'`면
  `pickFromGallery()`, 아니면(기본값) `takePhoto()`를 호출한다.
- `App.tsx`의 `captureActivityMission`은 더 이상 바로 카메라를 열지 않고
  `PhotoSourceDialog`를 띄운다. 고른 뒤(`captureWithSource`)부터는 기존
  흐름(미리보기 → 제출, 재촬영 포함)과 동일하다. 재촬영도 같은 다이얼로그를
  다시 띄워 매번 소스를 고를 수 있게 했다.

Figma S-04-1은 "중간 확인 화면 없이 바로 카메라를 연다"고 돼 있는데, 이
다이얼로그가 사실상 그 중간 단계다 — 카메라 없는 환경 지원이 이 트레이드오프의
이유다.
