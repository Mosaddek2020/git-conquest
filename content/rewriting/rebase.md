## story | Railroad tracks

Lucía's team merged `main` into their feature branches every morning to stay up to date. After a month, `git log --graph` looked like a railway junction: dozens of "Merge branch 'main' into feature/…" commits crossing each other. Nobody could follow it.

A senior engineer showed her another way to bring a branch up to date:

```term
$ git switch feature/export
$ git rebase main
Successfully rebased and updated refs/heads/feature/export.
```

Instead of adding a merge commit, rebase **replayed** her feature's commits on top of the latest `main`, as if she had started the feature today. History became a straight line again.

## model | Replaying commits on a new base

```replay
title: Rebasing a feature onto the latest main
show: graph
setup: init; commit "Create app"; git switch -c feature/export; commit "Add CSV export"; commit "Add export button"; git switch main; commit "Fix login bug"; commit "Update README"; git switch feature/export
step: git rebase main | Git takes the feature's two commits, sets them aside, moves the branch to main's tip, and reapplies them one by one. They get NEW ids (look at the hashes).
step: git switch main | Now main can be fast-forwarded to the feature.
step: git merge feature/export | A fast-forward: a perfectly straight history.
```

What rebase does, step by step:

1. Find the commits on your branch that are not on the target (`main..feature`).
2. Temporarily set them aside.
3. Move your branch to the target's tip.
4. Re-apply each commit, in order, creating **new commits** with the same changes and messages but **new ids** (their parents changed).

```diagram
rebase-vs-merge
```

## commands | Rebase basics

```term
$ git switch feature/export
$ git rebase main              # replay feature's commits on top of main
$ git rebase --continue        # after resolving a conflict in the current commit
$ git rebase --skip            # drop the commit that conflicted
$ git rebase --abort           # give up: everything back to how it was
$ git pull --rebase            # fetch, then rebase your local commits on the remote ones
```

**Conflicts during rebase** happen one commit at a time. Git stops at the commit that conflicts, you resolve that file, `git add` it, and run `git rebase --continue`. Git then carries on with the next commit.

> [!WARNING]
> During a rebase, `--ours` means **the branch you are rebasing onto** (e.g. main) and `--theirs` means **your commit being replayed**. It is the opposite of a merge, because rebase is building on top of the target.

## analogy | Re-recording on a new backing track

Imagine you recorded a guitar part over a song's first draft. The band then improves the backing track. Instead of awkwardly splicing two recordings (merge), you **re-record your part on top of the new backing track** (rebase). The result sounds as if you had played along with the final version from the start. But it is a new recording: anyone holding the old one now has something different.

## team | When teams rebase

- **Updating your own feature branch** before opening or updating a pull request: `git rebase main` (or `git pull --rebase`).
- **Keeping `main` linear**: some teams require "rebase and merge" on GitHub.
- **Never** on commits other people are building on (the golden rule, two lessons ahead). If you rebase a branch you already pushed, you will need `git push --force-with-lease`, and you should be sure nobody else uses that branch.

## traps | Rebase traps

**Rebasing shared branches.** Teammates' copies still have the old commits; things get duplicated and confusing.

**Confusing `--ours`/`--theirs`** during a rebase conflict (see the warning above).

**Panicking mid-rebase.** `git rebase --abort` is always there. And the reflog remembers your branch's pre-rebase position (`ORIG_HEAD` too).

**Rebasing with uncommitted changes.** Git refuses. Commit or stash first.

## lab | Straighten the history

Your feature branch has fallen behind main. Rebase it, handle one conflict along the way, and land the feature with a fast-forward.
