## story | "Can you just merge it?"

When Hugo joined a team that used pull requests, he found it slow at first: why open a PR, wait for review and checks, then merge, when he could just push to `main`?

Three months later he had changed his mind. PRs had caught two bugs he would have shipped, taught him half the codebase through review comments, and twice let the team revert a whole feature with one click. Most importantly, nobody ever broke `main` without noticing, because nothing reached `main` without a second pair of eyes and a green test run.

## model | A pull request is a proposal to merge a branch

```diagram
pr-lifecycle
```

A **pull request (PR)** asks: *please merge branch `head` into branch `base`* (usually `feature/x` into `main`). It shows the combined diff, the commits, review comments, and automated check results. While it is open, **every push to the head branch updates the PR**.

When it is approved and checks pass, it can be merged in one of three ways:

| Button | What lands on main | History |
|---|---|---|
| **Create a merge commit** | all the branch's commits plus a merge commit | full detail, non-linear |
| **Squash and merge** | one new commit containing the whole PR | linear, one commit per PR |
| **Rebase and merge** | the branch's commits replayed onto main | linear, keeps each commit |

After merging, the branch is usually deleted, and everyone **pulls main** to get the result.

## commands | PRs with the GitHub CLI

```term
$ git switch -c feature/dark-mode
$ git commit -am "Add dark mode toggle"
$ git push -u origin feature/dark-mode
$ gh pr create --title "Add dark mode" --body "Adds a toggle in settings. Fixes #12"
$ gh pr list                     # open PRs
$ gh pr view 15                  # details, reviews, checks
$ gh pr diff 15                  # the combined diff
$ gh pr checks 15                # CI status
$ gh pr merge 15 --squash --delete-branch    # merge it (once allowed)
$ git switch main && git pull    # get the merged result locally
```

`gh pr create --fill` uses your commit messages for the title and body.

## analogy | Submitting an article to an editor

You do not publish straight to the front page of a newspaper. You submit your article (open a PR), an editor reads it and leaves notes (review), you revise and resubmit (push more commits, the PR updates), the fact-checkers run their checks (CI), and the editor publishes it (merge). The newspaper (main) stays trustworthy.

## team | PRs that get merged quickly

- **Small**: under ~400 changed lines when possible. Big PRs get skimmed, small ones get reviewed.
- **One purpose**: a PR that fixes a bug and refactors a module is two PRs.
- **A clear description**: what and why, how to test, screenshots for UI, and `Fixes #N`.
- **Draft PRs** (`gh pr create --draft`) to share early work for feedback.
- **Keep it current**: if main moves, rebase your branch (`git rebase origin/main` + `--force-with-lease`) or merge main into it, depending on team policy.

## traps | PR traps

**Opening a PR from main.** Always work on a branch; a PR from main to main has nothing to compare.

**Forgetting to push new commits.** Commits that are only local do not appear in the PR.

**Not pulling after merge.** Your local main is stale until you pull. Start the next branch from an up-to-date main.

**Squash-merge surprise.** After a squash merge, your feature branch's commits are not in main (main has one new commit instead), so `git branch -d` may refuse. That is expected: use `-D` once you confirmed the PR merged.

## lab | Your first pull request

Fix an issue on a branch, open a pull request that closes it, merge it with a squash, and bring your local main up to date.
