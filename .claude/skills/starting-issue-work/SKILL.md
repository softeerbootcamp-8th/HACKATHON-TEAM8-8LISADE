---
name: starting-issue-work
description: Use when asked to implement a new feature, fix, chore, or infra change (e.g. "GPS 현재 위치 저장 기능 구현해줘") before writing or editing any production code — also use when given an issue number (e.g. "#12 구현해줘") to confirm the issue before starting.
---

# Starting Issue Work

## Overview

Entry point of the 8LISADE issue lifecycle. A request to build something
is never a signal to start editing code — it is a signal to make sure a
GitHub Issue and a `develop`-based working branch exist first.

**Core principle:** No production code changes before an Issue and a
working branch exist for them.

## Flow

```text
1. Search existing Issues/PRs for this request (gh issue list / gh search)
2. Issue number given, or a clearly matching open Issue found
   → use it, do NOT create a duplicate
   Otherwise
   → create a new Issue using .github/ISSUE_TEMPLATE, title `[<type>] <설명>`
3. Apply labels (feat/fix/chore/infra, + blocker if relevant)
4. Update develop: git checkout develop && git fetch origin && git pull
5. Create working branch from develop: feat|fix|chore/#<issue-number>-<description>
   (see following-8lisade-git-rules for the git commands)
6. Hand off to developing-issue for the actual implementation
```

## Key rule

If the user says "GPS 현재 위치 저장 기능 구현해줘", do not touch source
files yet. Run steps 1–5 first. Only after the Issue and branch exist,
proceed to `developing-issue`.

If the user references an existing issue ("#12 구현해줘"), skip Issue
creation — read Issue #12's `## 요구사항` and `## 설계`, and go straight
to steps 4–5 (branch), then `developing-issue`.

**REQUIRED SUB-SKILL:** Use `following-8lisade-git-rules` before any
branch-creation git command.

## Quick reference

| Situation | Action |
|---|---|
| No related issue exists | Create one from `.github/ISSUE_TEMPLATE/task.yml` content |
| Related open issue exists | Reuse it — do not create a duplicate |
| Issue number given directly | Read that issue, skip creation |
| develop has diverged | `git fetch origin && git checkout develop && git pull` before branching |

Branch naming, label set, and Issue body structure are defined in
`GROUND-RULE.md` §1–3 — this skill only sequences when to apply them.
