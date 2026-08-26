# Lombok 생성자 전환 (#77)

backend의 손수 작성 생성자를 Lombok 생성자 애노테이션으로 치환했다. 동작
보존이 목표이며, Lombok으로 재현 불가능한 생성자는 이유와 함께 제외했다.

## 전환

| 그룹 | 애노테이션 | 개수 |
|---|---|---|
| Spring 빈 (@Service/@RestController/@Component) | `@RequiredArgsConstructor` | 23 |
| 엔티티 | `@NoArgsConstructor(access = PROTECTED)` (+ 순수 all-args 10개는 `@AllArgsConstructor`) | 12 |
| ErrorCode enum | `@RequiredArgsConstructor` | 4 |

> Spring 빈 중 `MissionService`·`MissionController`는 `this.x=x`처럼 등호
> 좌우 공백이 없는 스타일이라 최초 스캔에서 누락됐다가 뒤늦게 포함했다.
> 공백 무관 정규식으로 재스캔해 확정했다.

- **Spring 빈**: `final` 필드 DI 생성자를 `@RequiredArgsConstructor`로 대체.
  인라인 초기화 필드(`LocationService.consecutiveOutsideCounts`)는
  `@RequiredArgsConstructor`가 자동 제외하므로 주입 목록에 영향 없음.
- **엔티티**: `protected Xxx()`(JPA) → `@NoArgsConstructor(PROTECTED)`,
  손수 all-args 생성자 → `@AllArgsConstructor`. `@Getter`와 `create()`
  정적 팩토리는 유지. all-args 가시성은 기존과 동일한 `public`으로 두어
  id 지정 픽스처를 만드는 테스트 호출부를 그대로 보존.
- **ErrorCode enum**: 생성자만 `@RequiredArgsConstructor`로 제거. 접근자
  `status()/code()/message()`는 `ErrorCode` 인터페이스 규약(무접두사)이라
  `@Getter`로 대체 불가 → 손수 유지.

## 주의 지점

- **`Trip`의 필드 재배치**: 손수 생성자 파라미터 순서가 `(... title, place,
  description ...)`인데 필드 선언 순서는 `title, description, place`였다.
  `@AllArgsConstructor`는 필드 선언 순서로 생성하므로, 그대로 두면 같은
  `String`인 `place`/`description`이 조용히 뒤바뀐다(컴파일 에러 없음).
  필드 선언을 생성자 순서에 맞춰 재배치해 생성된 생성자를 기존과 완전히
  동일하게 만들었다. `@Column`은 이름 매핑이라 JPA/DDL 영향 없음.
- 나머지 9개 엔티티는 필드 순서 == 생성자 순서라 무위험 drop-in.
- **`CurrentLocation`**: develop(#67)에서 파생 필드 `outsideSince`가 추가되며
  생성자가 `this.outsideSince = isOutside ? updatedAt : null;`처럼 파생 로직을
  갖게 됐다. `@AllArgsConstructor`로 재현 불가(파라미터 수·로직 불일치)라
  `@NoArgsConstructor(PROTECTED)`만 적용하고 로직 생성자는 손수 유지했다.

## 제외 (Lombok으로 재현 불가)

- **`@Value` 주입 빈** `S3StoragePresigner`, `FirebaseConfig`: 생성자
  파라미터에 `@Value`가 붙어 `@RequiredArgsConstructor`로 대체 불가.
- **`ApiException`**: 생성자가 `super(errorCode.message())`를 호출한다.
  Lombok 생성자는 파생값을 넘기는 커스텀 `super(...)`를 재현하지 못해
  적용 시 예외 메시지가 유실된다.
- **`MissionSubmission`**: all-args가 아닌 `private` 부분 생성자 + 정적
  팩토리 구조라 `@NoArgsConstructor(PROTECTED)`만 적용.

## 검증

- `./gradlew build` (compile + 전체 테스트 + check) → **BUILD SUCCESSFUL**
