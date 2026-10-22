## story | Three commits too many

Aisha spent the morning on a new checkout flow and made three commits. At lunch her team lead said the product team had cancelled the feature. The commits were never pushed.

Option one: delete the code by hand and make a fourth commit. But the history would then contain three commits for a feature that never existed, plus an undo.

Option two:

```term
$ git reset --hard HEAD~3
HEAD is now at 4ab9e10 Fix footer links
```

The branch jumped back three commits and her files matched that commit again. Her unpushed history was as if the morning never happened.

`git reset` moves the current branch to another commit. Its three modes decide what happens to your staging area and your files along the way. Understanding them is the difference between a precise undo and losing a day of work.

## model | What each mode resets

```diagram
reset-modes
```

`git reset <commit>` always **moves the current branch** (and HEAD) to `<commit>`. Then:

| Mode | Staging area | Working directory | Typical use |
|---|---|---|---|
| `--soft` | untouched | untouched | Undo commits but keep everything **staged**: re-commit differently, squash several commits into one |
| `--mixed` (default) | reset to match `<commit>` | untouched | Undo commits and **unstage**: keep the edits as normal changes |
| `--hard` | reset | **reset**: files overwritten | Throw commits **and** uncommitted edits away |

```replay
title: Soft, mixed and hard on the same history
show: graph,areas
setup: init; commit "Add cart"; commit "Add checkout step 1"; commit "Add checkout step 2"
step: git reset --soft HEAD~1 | --soft: main moves back one commit. The undone change is still staged.
step: git reset HEAD~1 | --mixed (the default): main moves back another commit and the staging area is reset. Both changes are now unstaged edits in the working directory.
step: git reset --hard HEAD | --hard: the staging area and working directory are reset to HEAD. The edits are gone.
```

Without a commit, `git reset` defaults to `HEAD`, so `git reset` alone just unstages everything, and `git reset file.txt` unstages one file (like `git restore --staged`).

## commands | Reset recipes

```term
$ git reset --soft HEAD~1      # undo the last commit, keep its changes staged
$ git reset HEAD~1             # undo the last commit, keep its changes unstaged
$ git reset --hard HEAD~1      # undo the last commit and delete its changes
$ git reset --hard             # discard ALL uncommitted changes (back to HEAD)
$ git reset --soft HEAD~3      # squash: then commit once to replace three commits
$ git reset --hard origin/main # make your branch identical to the remote one
$ git reset app.js             # unstage one file
```

## analogy | Rewinding a tape

Imagine recording music on a multi-track tape:

- `--soft` rewinds the tape counter but leaves the recorded sound sitting in the mixing desk, ready to be re-recorded.
- `--mixed` rewinds and clears the mixing desk, but the musicians still have their parts written on their sheet music.
- `--hard` rewinds, clears the desk **and** tears up the sheet music.

## team | Reset on a team

Reset rewrites **your branch's history**. The rules match amend:

- Reset freely on **local, unpushed** commits.
- On a branch others have pulled, use `git revert` (next lesson) instead.
- `git reset --hard origin/main` is a common "make my local main match the server exactly" command, e.g. after a messed-up experiment on main.

> [!CAUTION]
> `git reset --hard` deletes uncommitted work with no confirmation and no recycle bin. Committed work can usually be recovered with the reflog; uncommitted edits cannot. Run `git status` first.

## traps | Reset traps

**`--hard` with uncommitted work you wanted.** Gone. Stash first if unsure.

**Resetting a pushed branch.** Your next push is rejected (non-fast-forward). Forcing it rewrites history for everyone.

**Confusing reset and revert.** Reset moves the branch backwards (history disappears). Revert moves forwards by adding an undo commit (history kept).

**Forgetting the reflog exists.** "I reset too far!" is fixable: `git reflog`, find the old id, `git reset --hard <id>`.

## lab | Undo at three strengths

A shopping-cart project has some commits you want to undo in different ways. Watch the **Three areas** and **Commit graph** panels after each reset: the graph keeps showing undone commits faded, because the reflog still remembers them.
