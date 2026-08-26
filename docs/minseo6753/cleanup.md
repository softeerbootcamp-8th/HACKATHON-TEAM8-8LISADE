# 저장소 정리

## Issue #148: 사용 완료된 .gitkeep 파일 정리

`backend/src/main/java/com/palisade/travel/domain/**` 아래 초기 패키지
스캐폴딩 때 만든 `.gitkeep` 26개가 실제 소스 파일이 채워진 뒤에도 남아
있었다. 전부 삭제했다(`mission/exception`, `notification/exception`처럼
여전히 비어 있던 두 디렉터리 포함) — 사용자가 예외 없이 전체 삭제를
요청했고, 빈 디렉터리는 Gradle/Java 빌드가 필요 시 다시 만들어 주므로
git이 추적하지 않아도 문제없다.

### 검증

- `./gradlew compileJava`: 성공 (기존에 있던 `S3PresignerConfig` deprecation
  경고 1건 외 이상 없음)
