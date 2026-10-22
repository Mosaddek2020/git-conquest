## story | The branch that vanished

Diego deleted what he thought was an old branch:

```term
$ git branch -D payment-retries
Deleted branch payment-retries (was 5e8a1c3).
```

It was not old. It held two days of unpushed work. His stomach dropped. A senior colleague leaned over:

```term
$ git reflog
a10d2e4 HEAD@{0}: checkout: moving from payment-retries to main
5e8a1c3 HEAD@{1}: commit: Retry failed payments with backoff
...
$ git branch payment-retries 5e8a1c3
```

The branch was back, commits and all. Git had never deleted the commits, only the label pointing at them. And git keeps a private diary of every position HEAD has been at: the **reflog**.

## model | Commits are hard to lose

Git almost never deletes commits immediately. When you reset, amend, rebase or delete a branch, the commits are simply no longer *reachable* from a branch. They stay in the object database for at least 30 days (by default) before garbage collection may remove them.

The reflog records every move of HEAD (and of each branch) **on your machine**:

```term
$ git reflog
9fba052 (HEAD -> main) HEAD@{0}: reset: moving to HEAD~2
e90e551 HEAD@{1}: commit: Add invoice totals
3c4a1b0 HEAD@{2}: commit: Add invoice table
98969a4 HEAD@{3}: checkout: moving from feature to main
```

`HEAD@{1}` means "where HEAD was one move ago". You can use it anywhere you would use a commit id: `git reset --hard HEAD@{1}` undoes the reset you just did.

```replay
title: Recovering from reset --hard
show: graph
setup: init; commit "Add invoices"; commit "Add invoice table"; commit "Add invoice totals"
step: git reset --hard HEAD~2 | Oops. main jumped back two commits. The lost commits are drawn faded: unreachable, but still stored.
step: git reflog | The reflog lists every position HEAD has had, including before the reset.
step: git reset --hard HEAD@{1} | Jump back to where HEAD was one move ago. Everything is restored.
```

## commands | Recovery recipes

```term
$ git reflog                          # every move of HEAD, newest first
$ git reflog show main                # moves of one branch
$ git reset --hard HEAD@{1}           # undo the last reset / amend / rebase
$ git branch rescued <id>             # give a lost commit a branch again
$ git switch -c rescued <id>          # same, and switch to it
$ git cherry-pick <id>                # copy one lost commit onto the current branch
```

## analogy | The building's CCTV

Branches are like name tags on desks. Remove a name tag and the desk (the commit) is still there; you just cannot find it by name. The reflog is the building's CCTV footage: it shows every desk you visited, in order, with timestamps. Find the moment in the footage, walk back to that desk, and put a name tag on it again.

## team | What the reflog can and cannot do

- It is **local only**. It is not pushed and does not exist on GitHub or on a teammate's machine.
- It records **commits**, so it cannot recover uncommitted edits destroyed by `reset --hard` or `restore`. Commit early, even as "WIP", and squash later.
- Entries expire (90 days for reachable, 30 for unreachable by default).
- It is the reason senior developers seem fearless with git: they know that anything **committed** is almost always recoverable.

## traps | Reflog misunderstandings

**"I'll recover it from GitHub's reflog."** There isn't one you can use. Recover on the machine where the work happened.

**Searching the wrong reflog.** `git reflog` is HEAD's log. If you are looking for a branch's old position, `git reflog show <branch>` can be clearer.

**Using `HEAD@{n}` after more moves.** Each new move shifts the numbers. Use the commit id from the reflog line to be safe.

## lab | Undo the undo

A careless afternoon: a hard reset too far and a deleted branch. Use the reflog to recover both, without losing anything.
