---
name: create-pr
description: Create a GitHub pull request for the current changes in this repo. Branches off main if needed, commits, runs the CI checks locally (lint, build, test), fills in .github/pull_request_template.md, pushes and opens the PR with gh. Use when the user asks to open/create/submit a PR, "push this up for review", or "ship it".
---

# Create a pull request

The user invoking this skill authorizes committing, pushing the branch, and opening the PR. Don't force-push, don't push to `main`, and don't merge.

## 1. Inspect state

```bash
git status --short
git branch --show-current
git diff --stat
git diff --cached --stat
git log --oneline main..HEAD
```

- Nothing changed and no commits ahead of `main` → stop and tell the user there's nothing to PR.
- Check the diff for secrets or junk: `.env*`, `coverage/`, `dist/`, credentials, stray `console.log`. Never stage `.env` files. If something suspicious shows up, ask before including it.

## 2. Branch

If you're on `main`, create a branch. Name it `<type>/<short-kebab-summary>`, matching the existing branches:

| type    | use for                                        |
|---------|------------------------------------------------|
| `feat`  | new endpoint, module, feature                  |
| `fix`   | bug fix                                        |
| `chore` | deps, build, CI, docs, tooling, Claude config  |
| `refactor` | behaviour-preserving restructuring          |
| `test`  | tests only                                     |

Example: `git switch -c feat/monthly-report`. If you're already on a feature branch, keep it.

## 3. Verify locally (same order CI runs)

```bash
pnpm run lint
pnpm run build
pnpm exec vitest run
```

`pnpm run lint` runs `--fix`, so stage whatever it reformats. If any step fails, fix it when the fix is clearly within the change's scope; otherwise stop and report the failure output. **Don't open a PR with failing checks** unless the user explicitly says to, and in that case say so in the PR body.

## 4. Commit

Stage specific paths, not `git add -A`. Commit message format:

Commits **on the branch** use lowercase conventional style (as in the commits inside past PRs, e.g. `feat: creat new endpoint to check current session`):

```
<type>: <imperative summary, lowercase, no period>
```

Use small, focused commits if the work naturally splits; one commit is fine otherwise. PRs are squash-merged, so the PR title is what ends up on `main`.

Add the attribution trailer from the current system instructions, if any. Use a heredoc so the formatting survives.

## 5. PR title

Match the merged PRs (#15–#26):

```
[TYPE] - Short summary in sentence case
```

- `TYPE` is uppercase: `FEAT`, `FIX`, `CHORE`, `REFACTOR`, `TEST`. It should match the branch prefix.
- Mixed PRs stack the tags: `[CHORE][FEAT] - Setup swagger + adding documentation`.
- Exactly one space on each side of the `-`. No trailing period, and keep it under ~60 characters.
- Real examples: `[FEAT] - Redirect login to frontend`, `[FIX] - Update DTOs swagger`, `[CHORE] - Update Dockerfile and build commands`.

## 6. PR body

Base it on `.github/pull_request_template.md`, trimmed the way past PRs do it:

```markdown
## Context

- Needs to <why this change is needed, one or two bullets>

## List of changes

- <short bullet per change: "New endpoint GET /reports/monthly", "Updated swagger documentation", "Pass as a new env variable">

# Type of change

-   [ ] Chore (changes to the build process or auxiliary tools and libraries)
-   [ ] Configuration (non-breaking change which adds app configuration)
-   [ ] Bug fix (non-breaking change which fixes an issue)
-   [x] New feature (non-breaking change which adds functionality)
-   [ ] Refactor (non-breaking change which improves a functionality)
-   [ ] Test (non-breaking change which adds or modifies tests)
-   [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
-   [ ] This change requires a documentation update
```

- **Drop** the `# Description` header and its "Fixes feature / Please include a short summary…" placeholder. Past PRs remove it.
- **Context** bullets typically start with "Needs to …". Keep them short and concrete.
- **List of changes**: brief, terse bullets. Name endpoints with verb + path and mention new env vars by name.
- **Type of change**: copy the checklist **verbatim** from the template (including the `-   [ ]` spacing) and tick every box that applies. More than one is fine, e.g. Chore + Bug fix.
- **`# UI/UX`**: omit it unless the frontend must react, e.g. a changed response shape, new cookie/CORS behaviour, or a new redirect. In that case keep the section and say what the frontend needs to do.
- If a new env var must be set in Koyeb before merge, add a `- ⚠️ Set <VAR> in Koyeb before merging` bullet under List of changes, since merging to `main` deploys.
- If you link an issue, add `- Closes #N` under Context.
- End the body with the PR attribution line from the current system instructions, if any.

## 7. Push and open

```bash
git push -u origin <branch>
gh pr create --repo SarayBalbuena/wind-tunnel-registry-backend --base main --head <branch> \
  --title "<[TYPE] - Summary>" --body-file <tmp file in scratchpad>
```

- Always pass `--repo` and `--head`. The `origin` remote still points at the old `sbalbuenaSeat/...` URL, which redirects. Without these flags `gh` fails with "Head sha can't be blank … No commits between".

- Open as `--draft` if the user said it's WIP or if checks were skipped.
- Don't add reviewers, assignees or labels unless asked. Past PRs have none, and the `not merge` label is reserved for dependabot PRs.
- If `gh` isn't authenticated, tell the user to run `! gh auth login`.

## 8. Report

Give the PR URL, branch name, title, and a one-line summary of the check results. Mention any env vars or deploy steps the reviewer needs to know about.
