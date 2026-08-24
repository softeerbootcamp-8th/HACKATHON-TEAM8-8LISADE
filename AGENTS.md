# AGENTS.md

AI Agent(그리고 사람)를 위한 이 Repository의 진입점.

- **`GROUND-RULE.md`가 개발 정책의 Source of Truth다.** Branch, Commit,
  PR, Merge, Review, Secret 정책 등 세부 규칙은 전부 그 문서를 본다.
- 개발 작업 전 관련 8LISADE Skill(아래 표)을 사용한다.
- Superpowers가 적용 가능한 개발 작업(brainstorming, TDD, systematic
  debugging, verification 등)에는 기존 Superpowers Skill을 그대로
  사용한다. 8LISADE Skill은 그 위에 GitHub Issue 기반 lifecycle과
  Git/GitHub 정책을 얹는 Adapter일 뿐, 개발 방법론을 다시 구현하지
  않는다.
- 프로젝트 정책이 Superpowers 기본 산출물 위치(`docs/superpowers/specs`,
  `docs/superpowers/plans` 등)와 충돌하면 8LISADE 정책이 우선한다
  (설계와 계획은 별도 문서가 아니라 GitHub Issue에 기록한다 —
  `developing-issue` 참고).
- GitHub Issue를 요구사항 / 설계 / 구현 기록의 중심으로 사용한다.

## 8LISADE Skill

`.claude/skills/`에 있으며 Claude Code가 자동으로 인식한다. Codex 등
다른 Agent 도구용으로 `.agents/skills/`에 동일 내용의 symlink를 함께
두었다 — 수정은 `.claude/skills/` 원본만 하면 된다. "GPS 저장
기능 구현해줘" 같은 요청이 오면 아래 순서로 자연스럽게 이어진다.

| Skill | Trigger |
|---|---|
| `starting-issue-work` | 새 기능/수정 요청을 받았을 때, 코드를 건드리기 전에 Issue와 working branch부터 확인/생성 |
| `developing-issue` | Issue와 branch가 준비된 상태에서 실제로 구현할 때 |
| `documenting-issue-work` | 구현이 끝나고 PR을 올리기 직전, 실제 결과를 Issue에 기록할 때 |
| `finishing-issue-work` | 문서화까지 끝나고 PR 생성 → review → merge → cleanup을 수행할 때 |
| `following-8lisade-git-rules` | 위 Skill들 어디서든, 실제 git/gh 명령을 실행하기 직전에 참조하는 공통 Git 정책 |

전체 lifecycle과 checklist는 `GROUND-RULE.md`를, Skill 검증 시나리오는
`.agents/tests/skill-scenarios.md`를 참고한다.
