## story | "Did it work in March?"

A customer reported that the PDF export of invoices had been broken "for a while." Hannah wanted to know whether it had ever worked. Instead of guessing, she went back in time:

```term
$ git log --oneline --until="2026-03-31" -1
7d3e9b2 Add invoice PDF export
$ git switch --detach 7d3e9b2
HEAD is now at 7d3e9b2 Add invoice PDF export
```

Her working directory now looked exactly like the project did that day. She ran the export: it worked. So the bug arrived later, which narrowed the search enormously. Then she returned to the present:

```term
$ git switch main
```

Moving to an old commit like this puts you in **detached HEAD** state. It sounds alarming. It is simply git's name for "looking at a commit that is not the tip of a branch."

## model | Where HEAD points

```diagram
detached-head
```

Normally HEAD points at a **branch**, and the branch points at a commit. When you commit, the branch moves forward and HEAD comes along.

When you check out a commit directly, HEAD points straight at **that commit**: it is *detached* from any branch. Everything still works: you can look, build, run tests, even commit. But new commits made here belong to no branch. Once you switch away, nothing points at them, and they will eventually be garbage-collected.

```replay
title: Detaching HEAD and coming back
show: graph
setup: init; commit "Add invoices"; commit "Add PDF export"; commit "Redesign header"; commit "Add dark mode"
step: git switch --detach HEAD~2 | HEAD now points directly at "Add PDF export". main has not moved.
step: commit "Experiment: bigger font" | A commit made here hangs off the old commit. No branch points at it.
step: git switch -c font-experiment | Creating a branch here gives the experiment a name, so it is safe.
step: git switch main | Back to the present. The experiment branch keeps its commit.
```

## commands | Visiting and returning

```term
$ git switch --detach <commit>      # visit a commit (modern)
$ git checkout <commit>             # visit a commit (classic; prints the detached HEAD notice)
$ git checkout v1.2.0               # visit a release tag
$ git switch -                      # go back to where you were
$ git switch main                   # return to a branch
$ git switch -c rescue-branch       # keep commits made while detached
```

You cannot switch while you have uncommitted changes that would be overwritten; git stops you with "Your local changes would be overwritten by checkout." Commit or stash first.

## analogy | A museum visit

Detached HEAD is a museum visit to a past version of your project. You can walk around and look at everything. If you start building something in the museum, though, it is not part of any exhibition: when you leave, the cleaning staff will eventually clear it away. If you want to keep what you built, put a label on it (create a branch) before you leave.

## team | When developers travel back

- **"Did this ever work?"**: check out an old release tag and test.
- **Reproducing a customer's bug** on the exact version they run: `git checkout v2.3.1`.
- **Comparing behaviour** before and after a change.
- **Bisecting** (Power Tools realm) automates this: git detaches HEAD on commit after commit for you.

## traps | Detached HEAD traps

**Committing while detached and then leaving.** Your commits are orphaned. If it happens, don't panic: `git reflog` (later in this realm) shows their ids, and `git branch rescue <id>` saves them.

**Confusing `git checkout <file>` and `git checkout <commit>`.** The old `checkout` command does both jobs. `git switch` (branches/commits) and `git restore` (files) split them up, which is why modern docs prefer them.

**Forgetting where you are.** Your prompt or `git status` says `HEAD detached at 7d3e9b2`. Check before you start real work.

## lab | Visit the past

An invoicing app's history has a release tag and several later commits. Travel back, look around, make an experimental commit, save it with a branch, and return.
