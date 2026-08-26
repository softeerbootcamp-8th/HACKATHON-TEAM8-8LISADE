# 인증 구현 기록

## 앱 재실행 세션 복원 (#104)

- 서버가 `JSESSIONID`에 30분 `Max-Age`를 설정해 Android WebView가 앱 프로세스 종료 뒤에도 세션 쿠키를 보관한다.
- 앱 시작 시 `GET /api/auth/me`로 남아 있는 서버 세션을 확인하고, 로그인 직후와 같은 역할·활성 Trip 분기를 재사용한다.
- 내부 API 요청은 공통 `apiFetch`를 사용한다. 로그인 자격 증명 실패를 제외한 401 응답은 세션 만료 이벤트로 전달하고, `App`이 인증 상태를 비운 뒤 로그인 화면으로 이동한다.
- 외부 presigned 업로드와 로컬 사진 URI 요청은 서버 세션과 무관하므로 공통 401 처리에서 제외했다.

검증: `frontend npm test` (28개 파일, 161개 테스트), `npm run lint`, `npm run build`, `backend ./gradlew test build`, `git diff --check`
