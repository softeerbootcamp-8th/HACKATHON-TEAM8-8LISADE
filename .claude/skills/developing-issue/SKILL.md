---
name: developing-issue
description: Use when actually implementing a GitHub Issue that already has a working branch — after starting-issue-work, before opening a PR. Covers design, TDD/debugging method choice, and issue design updates.
---

# Developing Issue

## Overview

Center of the 8LISADE development workflow. It does not reimplement any
methodology — it sequences existing Superpowers skills and adds one
project rule: **the Issue, not a separate doc, is where design lives.**

## Flow

```text
1. Read the Issue: ## 요구사항, ## 설계 (may be empty/partial)
2. Read relevant existing code/context
3. superpowers:brainstorming — turn the request into an approved design
   (skip only if the Issue's ## 설계 is already complete and unambiguous)
4. Update the Issue's ## 설계 with the approved design
5. Pick a Superpowers implementation skill:
   - Bug / failing test / unexpected behavior → superpowers:systematic-debugging first
   - New feature / behavior change → superpowers:test-driven-development
6. Implement
7. Commit in logical units (see following-8lisade-git-rules)
```

## Design-output override (reads GROUND-RULE §2, does not repeat it)

Superpowers' default brainstorming/writing-plans output often lands in
`docs/superpowers/specs/*` or `docs/superpowers/plans/*`. In this
repository, **do not create those files by default.** Write the approved
design into the current Issue's `## 설계` section instead.

| Scope | Where design goes |
|---|---|
| Bounded, clear task | Confirm design in chat, then write the approved summary into the Issue's `## 설계` |
| Architectural / cross-cutting | Same — Issue `## 설계`, not a separate spec file |
| User explicitly asks for a design doc, OR architecture spans multiple issues, OR is long-lived system knowledge | A separate doc under `docs/` is fine — link it from the Issue |

Task breakdown written to the Issue's `## 작업 항목` stays at a level a
teammate would want to read (e.g. "위치 저장 API", "Browser Geolocation
hook") — not step-by-step agent execution logs ("Step 1: write failing
test"). Superpowers manages that granularity at runtime; the Issue is not
its log.

## Quick reference

| Situation | Skill to use |
|---|---|
| New feature / behavior change | `superpowers:test-driven-development` |
| Bug fix / regression | `superpowers:systematic-debugging` (then TDD for the regression test) |
| Any creative/design decision before coding | `superpowers:brainstorming` |
| Multi-task plan needed | `superpowers:writing-plans` — output still lands in the Issue, not `docs/superpowers/plans/*` |

**REQUIRED SUB-SKILL:** `following-8lisade-git-rules` for every commit.

## Common mistake

Writing code immediately because the design "seems obvious." Skipping
brainstorming for anything beyond a trivial, unambiguous change means the
Issue's `## 설계` never gets filled in — breaking the traceability
`documenting-issue-work` depends on later.
