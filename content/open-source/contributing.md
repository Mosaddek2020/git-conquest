## story | A first contribution, start to finish

Amani wanted her first open-source contribution to be small. The project `bookworm/reader` had an issue labelled `good first issue`: "README install command is outdated". She read `CONTRIBUTING.md`, forked, fixed, and opened a pull request that said "Fixes #12". A maintainer replied within a day: "Thanks! One tiny thing: please use `npm ci` instead of `npm install`." She pushed one more commit and the PR was merged. Her GitHub profile now listed her as a contributor.

## model | The contribution flow

```term
upstream  ──fork──▶  origin (your fork)  ──clone──▶  local
                                           ◀──push── (branch)
upstream  ◀──────── pull request from origin:branch ──
```

1. Find something to work on (`good first issue`, `help wanted`, or ask first in an issue).
2. Read `CONTRIBUTING.md`: how to set up, test, name branches, write commits.
3. Fork and clone; add `upstream`.
4. Create a branch **from upstream's latest main**.
5. Commit, push the branch to **origin** (your fork).
6. Open a PR from `you:branch` to `upstream:main`, linking the issue.
7. Respond to review by pushing to the same branch.
8. After merge: sync your fork, delete the branch.

## commands | Contributing with gh

```term
$ gh repo fork bookworm/reader --clone
$ cd reader
$ git fetch upstream
$ git switch -c docs/install-command upstream/main
$ edit README.md
$ git commit -am "Update install command in README"
$ git push -u origin docs/install-command
$ gh pr create --title "Update install command in README" --body "Fixes #12"
```

`gh pr create` run inside a fork opens the PR against the **upstream** repository by default; the head is `you:docs/install-command`.

## analogy | Suggesting an edit to a published book

You cannot edit a printed book, but you can send the publisher a marked-up page with a polite note explaining the correction, referencing the reader's complaint they already logged. If they agree, the next printing includes it, and your name goes in the acknowledgements.

## team | What maintainers wish contributors knew

- **Start small.** Typos, docs, tests and small bugs are perfect first PRs.
- **Ask before big changes.** Open an issue first: "Would you accept a PR that adds X?"
- **Follow the project's style**, even where you prefer another.
- **One topic per PR**, with a clear description and tests if relevant.
- **Be patient and kind.** Many maintainers are unpaid volunteers.
- **Do not take silence personally**; a polite ping after a week or two is fine.

## traps | Contribution traps

**Branching from your fork's stale main** instead of upstream's latest main: your PR shows unrelated changes or conflicts.

**Opening the PR against your own fork.** Check the PR's base repository: it should be the upstream project.

**Committing generated files or formatting the whole project.** Keep the diff focused.

## lab | Make your first contribution

The `bookworm/reader` project has a good first issue. Contribute a fix from your fork, following the full flow.
