# 시연용 위치 조정 기본 중심 (#233)

학생 화면의 "시연용 위치 조정" 다이얼로그를 처음 열 때, 지도가 하드코딩된
서울시청 좌표(`DEFAULT_CENTER`)나 `place` 키워드 검색 결과로 잡히던 문제를
고쳤다. `GET/PUT/DELETE /api/student/locations/override` 응답에
`defaultCenter`를 추가했고, 이 값은 `LocationService.findDefaultCenter`가
`CurrentLocationRepository.findByUserIdAndTripId`로 조회한 학생의 마지막
보고 위치다.

프런트 `LocationOverrideControl`은 다이얼로그 초기 지도 중심을
`initialPointRef.current ?? defaultCenterRef.current ?? DEFAULT_CENTER`
순으로 정하고, `defaultCenter`가 있으면 기존 `centerOnPlace` 키워드 검색은
건너뛴다. 마지막 위치가 없는 학생(참여 직후 등)은 기존 fallback 그대로
동작한다.
