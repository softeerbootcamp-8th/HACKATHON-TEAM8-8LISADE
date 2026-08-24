---
name: following-8lisade-git-rules
description: Use when creating a branch, committing, pushing, rebasing, opening a PR, or merging in this repository — before running any git/gh command that changes branch state or history. Also use when a request implies committing straight to main/develop or force-pushing a shared branch.
---

# Following 8LISADE Git Rules

## Overview

Repository-wide Git/GitHub policy adapter. Not a standalone workflow — a
checklist to run *right before* any git/gh operation, from any other
8LISADE skill or ad-hoc request.

**Source of Truth:** Repository root `GROUND-RULE.md`. This skill does
not restate the policy — it only tells you when to check it and which
parts matter at the moment of action. If this skill and `GROUND-RULE.md`
ever disagree, `GROUND-RULE.md` wins; update this skill to match.

**Violating the letter of the rules is violating the spirit of the rules.**

## Before any git/gh command, ask

| About to... | Check |
|---|---|
| Create a branch | Branched from latest `develop`? Name matches `feat\|fix\|chore/#<issue>-<desc>`? (GROUND-RULE.md §1) |
| `git commit` | Target branch is a working branch, never `main`/`develop` directly? Message is Conventional Commits, no `Co-Authored-By`, no `--no-verify`? Change is one logical unit? (§4) |
| `git push` / `push --force*` | Never any `--force*` on `main`/`develop`. On a working branch, only `--force-with-lease`, only after `git rebase origin/develop`. Never `--amend` a commit already pushed. (§4, §5) |
| `gh pr create` | Base is `develop` (or `develop→main` only for the release PR)? Title `<type>: <description> (#N)`? Body follows the template with `Close #N`? Created Ready for Review, not Draft? (§6) |
| `gh pr merge` | Strategy is "Create a merge commit"? (§8) |
| Deleting a branch | PR actually merged (checked via `gh pr view`, not assumed)? (§10 lifecycle step 18) |

## Forbidden — no exceptions

```text
Direct commit to main or develop
git push --force / --force-with-lease on main or develop
git commit --no-verify
Co-Authored-By in commit messages or PR bodies
--amend on a commit already pushed to remote
```

If a request implies one of these, do it the compliant way instead and say so in one line — do not ask permission to skip the rule.

## Rationalizations — reality check

| Excuse | Reality |
|---|---|
| "It's a tiny fix, just push to develop directly" | Size doesn't change the rule. Create `fix/#N-...` and PR it. |
| "Rebased locally, --force is simpler than --force-with-lease" | `--force-with-lease` costs nothing extra and prevents clobbering others' pushes. Always use it on working branches. |
| "User explicitly said `git push --force`" | On `main`/`develop`, refuse and explain why; on a working branch, use `--force-with-lease` and say you substituted it. |
| "Co-Authored-By is standard practice elsewhere" | This repo forbids it. Omit it. |
| "The commit's already pushed but the message has a typo, just amend" | Pushed commits are not amended. Fix with a new commit. |
| "Squash/rebase merge is faster in the GitHub UI" | Ground Rule requires "Create a merge commit" regardless of what the repo UI defaults to. |

## Red flags — stop and use the compliant path

- About to run `git commit` while `git branch --show-current` reports `main` or `develop`.
- About to run `git push --force` (without `--with-lease`) anywhere.
- About to run `git push --force*` and current branch is `main`/`develop`.
- Composing a PR body/commit message that includes "Co-Authored-By".
- About to delete a branch without first confirming its PR shows `MERGED`.

## Required sub-skill

For the surrounding development lifecycle (Issue → branch → implement →
document → PR → merge), see the other 8LISADE skills: `starting-issue-work`,
`developing-issue`, `documenting-issue-work`, `finishing-issue-work`. Each
of them calls back into this skill for the actual git/gh commands.
