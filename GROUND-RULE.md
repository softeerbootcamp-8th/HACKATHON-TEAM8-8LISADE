# 8LISADE Development Ground Rule

- 팀: 8LISADE (softeer_8팀)
- 버전: v1.0
- 기준일: 2026-08-24

이 문서는 8LISADE Repository의 개발 정책 **Source of Truth**다. 사람과 AI Agent 모두 이 문서의 규칙을 따른다.

AI Agent용 Skill은 이 문서의 내용을 복제하지 않고 참조만 한다. 규칙이 바뀌면 이 문서만 수정하면 된다. Skill 원본은 `.claude/skills/`(Claude Code 자동 인식 경로)에 있고, Codex 등 다른 Agent 도구가 같은 Skill을 쓸 수 있도록 `.agents/skills/`에 동일 내용의 symlink를 함께 두었다.

---

## 1. Branch 전략

사용하는 branch:

- `main`
- `develop`

`release` branch는 사용하지 않는다.

모든 일반 개발 작업(feat/fix/chore/infra)은 Issue 단위 working branch에서 수행한다. working branch는 항상 `develop`에서 생성한다.

**`main`, `develop`에 직접 push 금지.**

### Branch naming

```text
feat/#<issue-number>-<description>
fix/#<issue-number>-<description>
chore/#<issue-number>-<description>
```

예:

```text
feat/#1-confluence-script
fix/#7-markdown-encoding-error
chore/#3-add-makefile
```

---

## 2. GitHub Issue

프로젝트 시작 전 Issue는 기능 위주로 미리 만들고 시작한다. 프로젝트 도중 생성하는 Issue도 동일한 템플릿(`.github/ISSUE_TEMPLATE/`)을 따른다.

### Issue 제목

```text
[<type>] <한 줄 설명>
```

지원 유형: `feat`, `fix`, `chore`, `infra`

### Issue 필수 구성

```markdown
## 배경 / 목적
## 요구사항
## 설계
## 작업 항목
## 완료 조건
```

Issue 생성 직후에는 `## 설계`가 완전히 확정되지 않아도 된다. 개발 시작 전 brainstorming/설계 과정에서 보완한다.

Issue는 단순 Task ticket이 아니라 **문제 → 요구사항 → 설계 → 작업 내용 → 실제 구현 결과**를 추적하는 개발 기록이다. 다음 두 섹션은 절대 섞지 않는다.

- `## 설계` = 개발 전에 의도했던 방향
- `## 구현 결과` = 실제 코드가 최종적으로 어떻게 구현되었는지

개발 중 설계가 바뀌었다면 `### 설계 대비 변경 사항`에 무엇이·왜 바뀌었는지 간결히 기록한다. Issue 하나만 읽어도 "왜 만들었는가 → 무엇을 요구했는가 → 어떻게 만들려고 했는가 → 실제로 어떻게 만들었는가 → 왜 설계가 변경되었는가 → 어떻게 검증했는가"를 알 수 있어야 한다.

---

## 3. GitHub Label

| Label | 의미 |
| --- | --- |
| `feat` | 신규 기능 |
| `fix` | 버그 수정 |
| `chore` | 환경 설정 / 문서 / 리팩터 |
| `infra` | 인프라 |
| `blocker` | 다른 작업을 차단하는 문제 |

> 위 5개 label은 GitHub Repository에 생성 완료했다. GitHub 기본 label(`bug`, `documentation`, `enhancement`, `duplicate`, `good first issue`, `help wanted`, `invalid`, `question`, `wontfix`)도 그대로 남아 있다 — 신규 개발 작업에는 위 5개 label을 사용한다. 추가 label은 팀 합의 후 추가한다.

---

## 4. Commit 규칙

[Conventional Commits](https://www.conventionalcommits.org/)를 사용한다.

```text
<type>: <description>
```

지원 타입: `feat`, `fix`, `docs`, `chore`

예:

```text
feat: Confluence Webhook 핸들러 추가
fix: HTML to Markdown 변환 UTF-8 오류 수정
docs: GPS 기록 정책 문서화
chore: Makefile lint target 추가
```

### 기본 원칙

- 큰 작업 하나를 마지막에 한 번에 commit하지 않는다. **논리적으로 독립적인 작업 단위마다 commit한다.**
- 단, 의미 없이 지나치게 작은 commit은 만들지 않는다.
- 각 commit은 가능하면 (1) 독립적으로 이해 가능 (2) 해당 시점에 build/test 가능한 상태 (3) 하나의 명확한 목적을 갖는다.

### 금지 사항

절대 사용하지 않는다.

```text
Co-Authored-By
git commit --no-verify
push된 commit에 대한 --amend
main에 force push
develop에 force push
```

feature branch를 rebase한 뒤 remote history 갱신이 필요하면:

```bash
git push --force-with-lease
```

만 허용한다. 단 `main`, `develop`에는 `--force`, `--force-with-lease` **둘 다 금지**한다.

---

## 5. Rebase 정책

working branch에서 develop의 최신 변경을 반영할 때는 로컬 `develop`을 먼저 최신화한 뒤 그 위에 rebase한다.

```bash
git checkout develop
git pull origin develop
git checkout <working-branch>
git rebase develop
```

(`git fetch origin && git rebase origin/develop`로 원격 브랜치에 바로 rebase해도 결과는 동일하지만, 로컬 `develop`도 항상 최신 상태로 맞춰두기 위해 위 방식을 기본으로 한다.)

이미 remote에 push된 working branch를 rebase했다면:

```bash
git push --force-with-lease
```

를 사용한다.

---

## 6. Pull Request 규칙

일반 working branch의 PR target은 항상 `develop`이다.

```text
feature/fix/chore branch → develop
```

`main`에는 일반 working branch에서 직접 PR하지 않는다. `main` merge는 `develop → main` PR을 통해서만 수행한다.

`main`에 머지하는 PR을 만들 때에는 이전 머지 시점으로부터 추가된 기능들에 대한 걸 PR 본문에 작성해둔다.

### PR Title

```text
<type>: <description> (#N)
```

예: `feat: 현재 위치 저장 기능 추가 (#12)`

### PR Body

```markdown
## 변경 사항
-

## 작업 이유
-

## 확인 방법
-

Close #N
```

> 이 Repository의 default branch는 `main`이므로 `feature → develop` merge 시 `Close #N` 문구가 있어도 Issue가 자동으로 close되지 않을 수 있다. merge 후 반드시:
> 1. Issue가 자동 close되었는지 확인
> 2. 안 되었다면, 작업이 실제로 완료된 상태일 때 직접 close
>
> GitHub Development 영역에서 Issue-PR 연결 상태도 함께 확인한다.

### PR 상태

기본적으로 **Ready for Review**로 생성한다. 특별한 이유가 없는 한 Draft PR을 만들지 않는다. PR에도 가능한 적절한 label을 지정한다.

---

## 7. Review 정책

Repository protection 설정이 가능하다면 최소 1명 승인 후 merge를 권장한다. 다만 작은 해커톤 팀의 개발 속도를 고려해 모든 PR에 무조건 사람 승인 대기를 강제하지는 않는다.

다음 중 하나라도 해당하면 review가 필요하다고 판단한다.

- 핵심 business logic 변경
- 인증 / 인가 변경
- DB schema 변경
- transaction 변경
- concurrency 변경
- 공유 infrastructure 변경
- 외부 API integration 핵심 변경
- 여러 module에 걸친 변경
- 대규모 refactoring
- 삭제 범위가 큰 변경
- 변경 영향도를 Agent 스스로 명확하게 판단하기 어려운 경우

다음과 같은 변경은 repository 설정이 허용한다면 review 없이 merge 가능할 수 있다.

- 단순 typo
- 작은 문서 변경
- 영향도가 명확한 설정 변경
- 매우 작은 UI 수정
- trivial fix

**애매하면 review가 필요한 쪽으로 판단한다.**

---

## 8. Merge

working branch PR은 **Create a merge commit**을 기본 merge strategy로 사용한다.

일반적인 흐름:

```text
Issue → Working Branch → develop PR → Merge Commit → Branch Delete
```

> 조사 결과, 현재 GitHub Repository 설정은 merge commit / squash / rebase merge를 모두 허용하고 있고(`Allow squash merging`, `Allow rebase merging` 모두 켜져 있음), `Automatically delete head branches` 설정은 꺼져 있다. Ground Rule과 실제 설정이 다르므로, PR을 병합할 때는 반드시 **"Create a merge commit"** 버튼을 사람이 직접 선택해야 하고, branch 삭제는 11절 lifecycle에 따라 수동/CLI로 수행한다.

---

## 9. Secret / 환경 변수

- `.env`는 절대 commit하지 않는다.
- PR 전에 credential, token, password, API key 등 secret이 staged diff에 포함되지 않았는지 반드시 확인한다.
- 환경 변수 공유는 팀의 별도 안전한 채널(Slack 등)을 사용한다. AI Agent가 secret 값을 읽거나 Slack 등에 직접 노출하도록 만들지 않는다.

> 조사 결과, 현재 Repository root에는 `.gitignore`가 없다. 최소한의 `.gitignore`(`.env`, build 산출물, `node_modules/` 등)를 추가했다. `.env` 파일이 생기면 반드시 이 `.gitignore`에 포함되어 있는지 다시 확인한다.

---

## 10. GitHub 작업 lifecycle

```text
1. 기존 Issue 확인
2. 필요한 경우 Issue 생성 + Label
3. develop 최신화
4. Issue 번호 기반 working branch 생성
5. 요구사항 분석
6. Issue의 설계 보완
7. 개발
8. 논리적 작업 단위 commit
9. 테스트 / build / 검증
10. 실제 구현 내용을 docs/{git name}/{domain}으로 기록 및 커밋(사람이 볼 수 있도록)
11. 실제 구현 결과를 Issue에 기록
12. 최신 develop 기준 rebase
13. remote push
14. develop 대상 PR 생성
15. label / issue connection 확인
16. 필요 시 review
17. Create a merge commit
18. Issue close 확인
19. local/remote branch cleanup
20. develop으로 복귀 후 최신화
```

---

## 11. Checklist

### 작업 시작 전

- [ ] develop 최신화
- [ ] Issue 존재 확인/생성
- [ ] Issue label
- [ ] working branch 생성

### 개발 시작 전

- [ ] 요구사항 확인
- [ ] Issue 설계 구체화
- [ ] 완료 조건 확인

### PR 전

- [ ] 테스트
- [ ] build
- [ ] secret 확인
- [ ] commit 규칙 준수
- [ ] 구현 상세 문서 작성 및 커밋 (`docs/<github-id>/<domain>.md`)
- [ ] Issue에 구현 결과 기록
- [ ] 최신 develop 기준 rebase

### PR 작성 후

- [ ] develop target 확인
- [ ] Ready for Review
- [ ] PR label
- [ ] Issue 연결 확인
- [ ] review 필요 여부 판단

### Merge 후

- [ ] 실제 merge 여부 확인
- [ ] Issue close
- [ ] local branch delete
- [ ] remote branch delete
- [ ] develop checkout
- [ ] develop pull (**"main에서 pull"이 아니라 develop으로 복귀 후 최신화**)

---

## 12. 아직 사람이 직접 해야 할 GitHub 설정

Repository 설정을 조사한 결과, 아래 항목은 Agent가 임의로 바꾸지 않았다. 팀에서 직접 결정/설정한다.

- `main`, `develop` branch protection rule 설정 여부 (현재 두 branch 모두 protection 없음 — 누구나 직접 push/force push 가능한 상태)
- Merge 시 "Create a merge commit"만 허용하도록 강제할지, 아니면 사람이 매번 버튼을 직접 선택할지
- `Automatically delete head branches` 옵션 사용 여부

---

## 13. 구현 상세 문서 (`docs/<github-id>/<domain>.md`)

Issue의 `## 구현 결과`와는 별도로, GitHub Issue를 열지 않고도 코드 관점에서 바로 볼 수 있는 짧은 구현 기록을 `docs/` 아래에도 남긴다.

경로:

```text
docs/<github-id>/<domain>.md
```

- `<github-id>`: 작업한 사람의 GitHub 계정명
- `<domain>`: 작업한 기능 영역 (예: `auth`, `location`, `notification`)

같은 `<domain>` 문서에 새 작업 내용을 이어서 추가(append)한다 — Issue마다 새 파일을 만들지 않는다.

10절 lifecycle의 9번(테스트/검증) 다음, 11번(Issue 기록) 이전에 작성하고 `docs: <description>` commit으로 남긴다. Issue `## 구현 결과`를 그대로 복사하지 않고 코드/도메인 관점에서 간결하게 요약한다.

> 이 문서는 매 PR마다 남기는 개인/도메인별 구현 기록이다. 인증 아키텍처, 데이터 모델 전체처럼 여러 Issue가 공유하는 장기 유지 시스템 문서가 필요한지는 `developing-issue` Skill 기준으로 별도 판단한다 — 이 절과는 목적이 다르다.
