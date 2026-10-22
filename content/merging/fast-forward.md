## story | The merge that wasn't

Felipe finished his `feature/newsletter` branch, switched to `main` and ran `git merge feature/newsletter`, bracing for something dramatic. Git printed:

```term
Updating 3c1d0a2..9e8f7b6
Fast-forward
 newsletter.html | 12 ++++++++++++
 1 file changed, 12 insertions(+)
```

No new commit, no questions. Nobody had touched `main` since he branched off, so there was nothing to *combine*: git simply moved the `main` label forward to his newest commit. That is a **fast-forward**.

## model | When main has not moved

```replay
title: A fast-forward merge
show: graph
setup: init; commit "Create site"; git switch -c feature/newsletter; commit "Add signup form"; commit "Add thank-you page"; git switch main
step: git merge feature/newsletter | main had no commits of its own since the branch started, so git just slides main forward. History stays a straight line.
step: git branch -d feature/newsletter | The feature branch is fully merged, so it can be deleted safely.
```

A fast-forward is possible when the branch you are merging **contains** the current branch's tip, i.e. the current branch is an ancestor of the other one. Git then has nothing to decide: every commit already exists and is already in the right order.

```diagram
merge-types
```

## commands | Merging

The pattern is always: **switch to the branch that should receive the work, then merge the other branch into it.**

```term
$ git switch main
$ git merge feature/newsletter      # bring feature's commits into main
$ git merge --ff-only feature/x     # merge only if a fast-forward is possible, otherwise refuse
$ git merge --no-ff feature/x       # always create a merge commit, even if ff is possible
$ git branch -d feature/newsletter  # tidy up afterwards
```

`git merge` reads as "merge *that* into *here*". Merging the wrong way round (main into your feature branch) is also a legitimate operation, used to bring a feature branch up to date, but it is not the same thing.

## analogy | Catching up in a relay

In a relay race, if the second runner never started running (main had no new commits), "merging" the first runner's progress is trivial: the second runner simply teleports to where the first one stopped. No negotiation needed. That is a fast-forward.

## team | Fast-forward on teams

- `--ff-only` is a popular safety setting for pulling (`git config --global pull.ff only`): it refuses to create surprise merge commits.
- Some teams prefer `--no-ff` for feature branches so that history shows a merge commit marking "the newsletter feature landed here", which is easy to revert as a unit.
- GitHub's "Rebase and merge" and "Squash and merge" buttons also produce linear history (Collaboration realm).

## traps | Fast-forward traps

**Merging from the wrong branch.** `git merge main` while on `feature` brings main into feature. Check `git branch` before merging.

**Expecting a merge commit.** With a fast-forward there is none; `git log` shows just the feature commits on main.

**Deleting the branch before merging.** `-d` protects you; `-D` does not.

## lab | Land a finished feature

A finished feature branch is waiting. Merge it into main as a fast-forward, confirm nothing new was created, and clean up.
