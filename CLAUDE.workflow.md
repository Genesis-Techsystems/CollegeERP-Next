# Project Workflow Rules for Claude Code

These rules apply to every change Claude makes in this repository. Follow them strictly.

---

## 1. Branching

- Before making any code change, create and check out a new branch from the current base branch (default: `main`).
- Branch naming: `claude/<short-description>` (e.g., `claude/fix-login-redirect`, `claude/add-stripe-webhook`).
- Never commit directly to `main` or `master`.
- Confirm the working tree is clean (`git status`) before branching.

---

## 2. Commit Size Limit

- Each commit must change fewer than **2000 lines** of code (additions + deletions combined).
- Exclude lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`) and generated files from the count.
- If a change exceeds 2000 lines, split it into multiple smaller commits, each on its own logical unit.
- Before asking for commit approval, run `git diff --stat` and report the line count.

---

## 3. Permission to Commit (mandatory)

Never commit automatically. Follow this sequence for every commit:

1. Stage the changes (`git add`).
2. Show the developer:
   - `git diff --stat` output (line count summary)
   - The proposed commit message
3. **Stop and wait.** The developer will test the change locally.
4. Commit only after the developer explicitly says "commit", "go ahead", "yes commit", "approved", or equivalent.
5. If the developer reports a failure or asks for changes, do not commit — fix and ask for approval again.
6. Pushing to a remote requires a **separate** explicit approval after the commit.

---

## 4. Commit Author Identity

- Every commit must be authored by the developer running the session, NOT by Claude or any AI identity.
- Before the first commit in a session, verify the git author config:
