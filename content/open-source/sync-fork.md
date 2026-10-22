## story | 312 commits behind

Six months after her first contribution, Amani wanted to fix another bug in `bookworm/reader`. Her fork's page said: *This branch is 312 commits behind bookworm:main.* Her local clone was just as stale. A branch made from that old main would produce a PR full of conflicts.

Keeping a fork in sync is a two-step habit: bring upstream's commits into your local main, then push them to your fork.

## model | Three copies of main

| Copy | Updated by |
|---|---|
| `upstream/main` (the project) | maintainers merging PRs |
| your local `main` | you: `git pull upstream main` / `git merge upstream/main` |
| `origin/main` (your fork on GitHub) | you: `git push origin main`, or `gh repo sync` |

Your fork's main should never contain your own work: it is a mirror of upstream. That way syncing is always a fast-forward.

```replay
title: Syncing a fork
show: graph
setup: github bookworm/reader; git clone -q https://github.com/bookworm/reader.git; cd reader; git remote rename origin upstream; teammate bookworm/reader "Add dark mode"; teammate bookworm/reader "Fix crash on empty library"
step: git fetch upstream | Download the project's new commits; upstream/main moves.
step: git merge --ff-only upstream/main | Fast-forward your local main to the project's main.
```

## commands | Sync recipes

```term
$ git switch main
$ git fetch upstream
$ git merge --ff-only upstream/main    # or: git pull upstream main
$ git push origin main                 # update your fork on GitHub
$ gh repo sync                         # GitHub-side alternative: sync your fork's main from upstream

# bring an in-progress branch up to date
$ git switch my-feature
$ git rebase upstream/main             # then: git push --force-with-lease
```

## analogy | Updating your photocopy

Your photocopy of the master plans goes stale as the firm revises the originals. Before sketching new improvements, you collect the latest pages from the archive (fetch upstream), replace your copy's pages (fast-forward main), and file the updated copy on your desk shelf (push to your fork).

## team | Sync habits

- **Sync before starting each new contribution**, and branch from `upstream/main`.
- **Rebase long-lived PR branches** onto `upstream/main` when maintainers ask, then `--force-with-lease` (your branch, your fork: safe).
- **Never commit on your fork's main.** If you did, move the commits to a branch and reset main to `upstream/main`.

## traps | Sync traps

**`--ff-only` refuses.** Your main has commits upstream does not have: you committed on main. Move them to a branch (`git branch rescue`), then `git reset --hard upstream/main`.

**Syncing origin but not local** (or vice versa). After `gh repo sync`, run `git pull origin main` locally too.

**Pushing a feature branch to upstream.** You cannot (no permission), and you should not try: push to origin.

## lab | Catch up with the project

Your fork of `bookworm/reader` and your local clone are stale, and you have an open PR branch that needs updating too. Bring everything up to date.
