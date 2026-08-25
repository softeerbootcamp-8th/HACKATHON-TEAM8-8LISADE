# 인증 구현 기록

## 세션 기반 사용자 인증 (#2)

- `User`는 `loginId`, BCrypt `passwordHash`, `STUDENT`/`TEACHER` 역할과 활성 상태를 가진다.
- `POST /api/auth/login`은 Spring Security 인증 후 `SecurityContext`를 HTTP 세션에 명시적으로 저장한다. 로그인 시 세션 ID를 교체한다.
- `GET /api/auth/me`, `POST /api/auth/logout`, `GET /api/auth/csrf`를 제공한다.
- 세션은 마지막 인증 요청 기준 30분 유휴 만료이며, 절대 만료 시간은 두지 않는다.
- CSRF는 쿠키 토큰 방식, CORS는 credentials를 허용하는 명시 Origin 방식으로 구성한다.
- 보호 API는 세션이 없으면 기존 JSON 401 응답을 반환한다.

검증: `./gradlew clean test build`
