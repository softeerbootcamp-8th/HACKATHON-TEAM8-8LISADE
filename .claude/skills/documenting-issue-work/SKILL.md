---
name: documenting-issue-work
description: Use when implementation looks done and you're about to open a PR — before creating the PR, verify the work and record the actual implementation result in the Issue. Also use when asked to "PR 올려줘" right after finishing code.
---

# Documenting Issue Work

## Overview

Bridge between "I think I'm done" and opening a PR. Must be driven by
what actually happened, not by memory of the original design.

**Core principle:** Evidence before documentation, documentation before PR.

## Flow

```text
1. superpowers:verification-before-completion — run tests/build, get real output
2. Inspect actual results: git diff, changed files, test output, build output
3. Write/append docs/<github-id>/<domain>.md with a short, code-level
   summary of what was actually built; commit it (`docs: ...`)
   (GROUND-RULE.md §13 — required per PR, separate from the Issue)
4. Update the Issue itself:
   - ## 구현 결과
     ### 주요 변경 사항
     ### 실제 구현 구조
     ### 설계 대비 변경 사항   ← only if design changed; state what + why
     ### 테스트 / 검증 결과
   - Check off completed items in ## 작업 항목 to match reality
5. Only then proceed to finishing-issue-work to open the PR
```

Use `.agents/references/issue-documentation-template.md` as the section
skeleton to paste into the Issue comment/body update.

`docs/<github-id>/<domain>.md` (step 3) and the Issue's `## 구현 결과`
(step 4) are not the same artifact and neither replaces the other — the
`docs/` file is a short code-facing note readable without opening
GitHub Issues; the Issue section is the full requirements→design→result
record. Do not create any other separate design/spec doc beyond what
GROUND-RULE.md §13 requires — `developing-issue` already covers when a
longer-lived architecture doc is warranted.

## `## 설계` vs `## 구현 결과` — never merge these

- `## 설계` = what was intended before coding (written by `developing-issue`)
- `## 구현 결과` = what the code actually does now

If they differ, say so explicitly in `### 설계 대비 변경 사항` — don't
edit `## 설계` to quietly match the final code, and don't leave the
mismatch unexplained.

## Rationalizations — reality check

| Excuse | Reality |
|---|---|
| "I'm confident it works, I'll skip verification" | Run `superpowers:verification-before-completion` anyway — confidence isn't evidence. |
| "The design didn't change much, skip the diff section" | Write it anyway; "no change" is itself useful information. |
| "Tests are slow, I'll just say tests pass" | Only write test results you actually observed this session. |
| "I'll write the doc after the PR is up" | Document first — `finishing-issue-work` expects this step already done. |
| "The Issue already has the details, skip docs/<id>/<domain>.md" | Ground Rule §13 requires it per PR regardless — it's read without opening the Issue. |

**REQUIRED SUB-SKILL:** `superpowers:verification-before-completion` runs
before any "구현 결과" is written. `following-8lisade-git-rules` if this
step also involves a docs commit.
