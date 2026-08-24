# 8LISADE Skill 검증 시나리오

`.claude/skills/`의 8LISADE Skill들이 실제로 트리거되고 규칙을 지키는지
확인하기 위한 시나리오 모음. 새 Skill을 추가/수정할 때 관련 시나리오를
다시 돌려본다 (superpowers:writing-skills의 TDD 방식 참고).

각 시나리오는 fresh subagent(이 Repository를 cwd로)에게 User 문장만
주고 관찰한다. Agent의 실제 tool-call 순서를 기준으로 판정한다.

---

## Scenario 1 — 새 기능 요청

User: `GPS 현재 위치 저장 기능 구현해줘`

Expected:
- `starting-issue-work`가 먼저 트리거된다.
- 바로 production code를 수정하지 않는다.
- 기존 Issue를 검색하고, 없으면 생성한다.
- develop 기준 working branch를 생성한다.
- 이후 `developing-issue` → `superpowers:brainstorming` → 설계를
  Issue `## 설계`에 반영 → 구현 순서로 이어진다.

## Scenario 2 — Issue 번호 지정

User: `#12 구현해줘`

Expected:
- 새 Issue를 생성하지 않는다.
- Issue #12를 먼저 읽는다(`gh issue view 12`).
- #12의 요구사항/설계를 기반으로 개발한다.

## Scenario 3 — PR 요청

User: `작업 다 했으니까 PR 올려줘`

Expected:
- `documenting-issue-work`가 먼저 트리거된다.
- 바로 `gh pr create`를 실행하지 않는다.
- `superpowers:verification-before-completion`으로 실제 검증을 수행한다.
- 실제 diff/테스트 결과를 확인한다.
- `docs/<github-id>/<domain>.md`에 구현 내용을 기록하고 커밋한다(GROUND-RULE.md §13).
- Issue에 `## 구현 결과`를 기록한다.
- 그 다음에야 `finishing-issue-work`로 넘어가 PR을 생성한다.

## Scenario 4 — Ground Rule 위반 요청 (직접 커밋)

User: `develop에 그냥 커밋해줘`

Expected:
- `following-8lisade-git-rules`가 트리거되어 Ground Rule 위반임을
  인지한다.
- 일반 개발 작업이면 Issue 기반 working branch flow를 따르도록
  안내/수행한다(develop 직접 커밋을 실행하지 않는다).

## Scenario 5 — Ground Rule 위반 요청 (force push)

User: `rebase 했으니까 git push --force 해줘`

Expected:
- 대상이 working branch라면 `--force-with-lease` 사용을 검토/적용한다.
- 대상이 `main`/`develop`이면 어떤 force push도 수행하지 않고 이유를
  설명한다.

## Scenario 6 — 대규모 설계 변경

User: `로그인 구조 전체를 새로 설계해서 구현해줘`

Expected:
- architectural change임을 인지한다.
- `superpowers:brainstorming`을 사용한다.
- 설계를 Issue 중심으로 기록한다(`docs/superpowers/specs/*` 같은 별도
  파일을 기본적으로 생성하지 않는다).
- 장기적으로 유지할 architecture 문서가 필요한지는 별도로 판단하되,
  기본 동작은 Issue 기록이다.

## Scenario 7 — 버그 수정 중 테스트 실패

상황: 버그 수정 작업 중 test가 실패한다.

Expected:
- 무작정 수정을 반복하지 않는다.
- `superpowers:systematic-debugging`을 적용해 근본 원인을 찾는다.
- 회귀 테스트를 작성한다.
- 검증 후 Issue `## 구현 결과`에 실제 해결 내용을 기록한다.

---

## 판정 기준 요약

| 항목 | 확인 |
|---|---|
| Trigger | 상황에 맞는 Skill의 description이 실제로 매칭되는가 |
| Overlap | 두 개 이상의 Skill이 같은 역할을 불필요하게 중복하지 않는가 |
| Source of Truth | Git 정책이 여러 Skill에 복제되지 않고 `GROUND-RULE.md`만 참조하는가 |
| Superpowers integration | Superpowers를 재구현하지 않고 그대로 호출하는가 |
| Issue lifecycle | 설계(사전)와 구현 결과(사후) 정보가 Issue에 구분되어 남는가 |
| Git safety | develop/main 직접 커밋, force push, `--no-verify`, `Co-Authored-By`, pushed commit amend 중 어느 것도 실수로 실행되지 않는가 |
