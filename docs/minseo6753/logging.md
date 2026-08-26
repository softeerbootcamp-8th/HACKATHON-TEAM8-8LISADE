# 백엔드 로깅 설정

## Issue #144: 백엔드 로깅(logback) 설정 및 로그 코드 추가

기존에는 별도 로깅 설정이 없어 Spring Boot 기본 콘솔 로그만 나왔고 파일로
남지 않았다. Logback 설정을 추가해 콘솔/파일 출력을 분리하고, 예외 처리
지점에 실제 로그 코드를 추가했다.

### 구현 구조

- `backend/src/main/resources/logback-spring.xml` 신규 추가.
  - `CONSOLE` appender: `ThresholdFilter(level=WARN)`로 WARN/ERROR만 출력.
  - `FILE` appender: 필터 없이 전체 레벨을 `logs/travel.log`에 저장.
    `SizeAndTimeBasedRollingPolicy`로 날짜별 롤링(50MB/파일, 30일, 총 2GB
    상한). 경로는 `LOG_PATH` 환경변수로 오버라이드 가능(기본값 `logs`).
  - 공용 `LOG_PATTERN` property(`%d{yyyy-MM-dd HH:mm:ss.SSS} [%thread]
    %-5level %logger{36} - %msg%n`)를 두 appender가 동일하게 사용.
  - `com.palisade.travel` 로거는 `DEBUG`로 세분화해 파일에 상세 기록.
  - `org.springframework`, `org.hibernate`, `org.apache`,
    `com.zaxxer.hikari`는 `WARN`으로 낮춰 프레임워크(system) 로그 양을 줄임.
  - `backend/logs/`를 `.gitignore`에 추가(런타임 산출물, `*.log`로도 이미
    커버되지만 디렉터리 자체를 명시).
- `GlobalExceptionHandler`에 Slf4j 로거 추가.
  - `ApiException`, 검증 실패, malformed request → `WARN`.
  - 미처리 `Exception` → 요청 method/URI와 함께 스택트레이스 포함
    `ERROR`(기존에는 아무 로그도 남기지 않고 그냥 삼켰음).

### 설계 대비 변경 사항

설계와 동일하게 구현. 다만 처음 작성한 `TimeBasedRollingPolicy` +
`maxFileSize` 조합이 logback에서 `%i` 토큰과 호환되지 않아
(`SizeAndTimeBasedRollingPolicy`가 필요) 구동 중 발견해 교체했다.

### 테스트 / 검증 결과

- `./gradlew compileJava`, `./gradlew test` — 모두 성공(BUILD SUCCESSFUL).
- 로컬에서 `SPRING_PROFILES_ACTIVE=local ./gradlew bootRun`으로 실행해
  실제 동작 확인(테스트 후 로그 파일/프로세스는 정리함):
  - 콘솔 표준출력에는 WARN 레벨(Firebase 자격증명 없음 경고) 1건만 출력되고
    INFO/DEBUG는 전혀 찍히지 않음을 확인.
  - `logs/travel.log`에는 같은 시점 INFO(`Starting TravelApplication` 등),
    DEBUG, WARN이 모두 동일한 포맷으로 기록됨을 확인.
  - 콘솔과 파일에 남은 동일 로그 라인(Firebase WARN)의 텍스트가 완전히
    일치해 포맷이 같음을 확인.
