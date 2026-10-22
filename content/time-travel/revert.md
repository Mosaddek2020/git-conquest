## story | Friday's bug, Monday's fix

A bad commit reached `main` on Friday and was deployed. Since then, four teammates have pulled `main` and two more commits have been merged on top. Rewriting history with reset now would pull the floor out from under everyone.

Instead, the team lead ran:

```term
$ git revert 9fba052
[main 6546696] Revert "Change checkout button handler"
 1 file changed, 3 insertions(+), 5 deletions(-)
```

`git revert` creates a **new** commit that applies the exact opposite of the bad one. Nothing is erased: history now honestly says "this was added, and later undone." Everyone simply pulls the new commit.

## model | Undo by adding

```replay
title: Revert adds an inverse commit
show: graph
setup: init; commit "Add login"; commit "Change button colour"; commit "Add reviews"
step: git revert --no-edit HEAD~1 | A new commit undoes "Change button colour". The commits after it are untouched and history only moves forward.
```

| | `git reset` | `git revert` |
|---|---|---|
| Direction | Moves the branch **back** | Adds a commit **forward** |
| History | Rewritten (commits drop off) | Preserved, plus an undo commit |
| Safe on shared branches? | No | Yes |
| Can undo an old commit in the middle? | Not without also dropping everything after it | Yes, just that one |

If later commits changed the same lines, revert can produce a **conflict**, just like a merge. You resolve it, then run `git revert --continue`. Conflicts are covered in the Merging realm.

## commands | Revert recipes

```term
$ git revert <commit>              # undo one commit (opens the editor for the message)
$ git revert --no-edit <commit>    # use the default "Revert …" message
$ git revert HEAD                  # undo the latest commit
$ git revert A..B                  # undo a range of commits (one revert commit each)
$ git revert --no-commit <commit>  # apply the inverse but let me commit it myself
$ git revert --abort | --continue  # control a revert that hit a conflict
```

## analogy | Correcting a published newspaper

A newspaper never un-prints yesterday's edition. If an article had an error, today's edition carries a correction: "Yesterday we reported X; in fact Y." Readers of both editions end up with the truth, and the record stays honest.

Reset is pulping yesterday's print run. Fine if nobody has bought a copy yet; a scandal if they have.

## team | Revert in practice

- **Production incident**: the fastest safe fix is often "revert the commit that caused it, deploy, then investigate calmly."
- On GitHub, merged pull requests have a **Revert** button that opens a new PR containing the revert commit.
- Reverting a **merge commit** needs `-m 1` to tell git which parent is the mainline. You will see it again in the Merging realm.

## traps | Revert traps

**Reverting the wrong commit.** Check `git show <id>` first.

**Reverting a revert.** Undoing a revert brings the original change back. It works, but leave a clear message.

**Expecting revert to remove sensitive data.** The bad commit is still in history. For leaked secrets, rotate the secret.

## lab | Undo a bad commit in shared history

A team's `main` branch contains a bad commit somewhere in the middle, with good work after it. Undo just that commit without rewriting history.
