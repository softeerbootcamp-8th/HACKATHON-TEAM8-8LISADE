# 사용하지 않는 example 샘플 도메인 패키지 제거 (#71)

- 프로젝트 초기 스캐폴딩으로 만들어진 `com.palisade.travel.domain.example` 패키지(controller / service / repository / entity / dto 3 / exception 2, 테스트 2)를 main·test 모두 삭제했다. 실 서비스 도메인(trip, geo, mission, notification, user)에서 이 패키지를 참조하는 코드는 하나도 없었다(`grep -rn "domain.example"` 결과 0건).
- [`SecurityConfig`](../../backend/src/main/java/com/palisade/travel/global/security/SecurityConfig.java)의 permitAll 매처에서 `"/api/examples/**"`를 제거했다. 인증 없이 접근 가능한 샘플 CRUD API가 운영 환경에 그대로 열려 있던 상태였고, 이번 삭제의 실질적인 이유다.
- `ExampleErrorCode`는 `global.error.ErrorCode`를 구현하기만 하는 단방향 의존이라 global 공통 코드는 건드릴 필요가 없었다.
- `examples` 테이블은 JPA 스캔 대상에서 빠지지만 `ddl-auto: update`는 테이블을 삭제하지 않으므로, 기존 local/prod DB에 남아 있는 `examples` 테이블은 필요 시 수동으로 `DROP TABLE` 해야 한다.

검증: `./gradlew build` (compile + 전체 테스트 + check) BUILD SUCCESSFUL.
