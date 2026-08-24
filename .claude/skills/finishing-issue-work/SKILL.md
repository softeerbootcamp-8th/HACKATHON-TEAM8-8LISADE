---
name: finishing-issue-work
description: Use when implementation and issue documentation are both complete and it's time to open, review, and merge the PR and clean up — the final step after documenting-issue-work. Also use when asked to "PR 올려줘", "머지해줘", or "정리해줘" for a finished issue.
---

# Finishing Issue Work

## Overview

Final leg of the 8LISADE issue lifecycle: PR → review decision → merge →
Issue close → branch cleanup → return to `develop`.

**Core principle:** Never assume GitHub state — check it.

## Flow

```text
1. Confirm documenting-issue-work already ran (Issue has ## 구현 결과)
   — if not, stop and do that first
2. git fetch origin && git rebase origin/develop
   (force-push with --force-with-lease only if this branch was already pushed)
3. git push
4. gh pr create --base develop --title "<type>: <description> (#N)" \
     --body "<.github/pull_request_template.md content, filled in>"
5. Apply PR labels; confirm GitHub Development panel links the Issue
6. Confirm PR is Ready for Review (not Draft)
7. Decide if review is required (GROUND-RULE.md §7); if so, wait for it —
   don't self-merge past a required review
8. gh pr merge --merge   (Create a merge commit — never --squash/--rebase)
9. gh issue view <N> — confirm it auto-closed; if not, close it manually
   only if the work is actually complete
10. Delete the merged branch (local + remote) — only after confirming
    gh pr view shows MERGED
11. git checkout develop && git fetch origin && git pull
```

**REQUIRED SUB-SKILL:** `following-8lisade-git-rules` for every git/gh
command above — rebase, push, PR base/title/merge-strategy, and the
force-push restriction all come from there.

## Exception — `develop → main` release PR

The flow above is for a normal working-branch PR. If the PR you're
opening is the occasional `develop → main` release PR instead, its body
must additionally summarize every feature merged into `develop` since
the last `main` merge (GROUND-RULE.md §6) — check `git log main..develop`
or the merged PR list, don't rely on memory.

## Review-needed judgment

Use `GROUND-RULE.md` §7 verbatim. When ambiguous, treat it as needing
review. Do not self-justify skipping review because of time pressure.

## Red flags

- About to run `gh pr merge` without having checked required-review status.
- About to delete a branch without confirming `MERGED` state first.
- About to squash/rebase-merge because it's the repo UI default — Ground
  Rule requires merge commit regardless.
- Closing the Issue before `## 구현 결과` exists.

## Quick reference

| Step | Command |
|---|---|
| Rebase on latest develop | `git fetch origin && git rebase origin/develop` |
| Update pushed branch after rebase | `git push --force-with-lease` |
| Open PR | `gh pr create --base develop ...` |
| Merge | `gh pr merge --merge` |
| Verify merged before cleanup | `gh pr view <N> --json state` |
| Return to develop | `git checkout develop && git pull` |
