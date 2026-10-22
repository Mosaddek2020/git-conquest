## story | Forty-three branches

When Ines took over a project, `git branch` printed 43 branches. Some were merged months ago, some were abandoned experiments, one was called `test2-final`, and nobody knew which ones still mattered.

She cleaned it up in ten minutes with three questions git can answer:

```term
$ git branch --merged main      # which branches are already fully in main? (safe to delete)
$ git branch --no-merged main   # which still hold unmerged work? (ask the owner)
$ git branch -v                 # what is the last commit on each?
```

Thirty-one branches were already merged and got deleted with `git branch -d`. Git refused to delete the unmerged ones with `-d`, which protected her from losing work by accident.

## commands | List, rename, delete

```term
$ git branch                 # list local branches
$ git branch -v              # with each branch's last commit
$ git branch -vv             # also show upstream and ahead/behind (Remotes realm)
$ git branch -a              # include remote-tracking branches
$ git branch --merged        # branches already merged into the current one
$ git branch --no-merged     # branches with work not merged into the current one
$ git branch -m new-name     # rename the current branch
$ git branch -m old new      # rename another branch
$ git branch -d feature      # delete a branch that is fully merged
$ git branch -D feature      # force-delete, merged or not
$ git branch --show-current  # print just the current branch name
```

`-d` is the safe delete. If the branch has commits that are not merged anywhere, git refuses:

```term
$ git branch -d experiment
error: the branch 'experiment' is not fully merged.
hint: If you are sure you want to delete it, run 'git branch -D experiment'
```

You cannot delete the branch you are currently on: switch away first.

## model | What "merged" means

A branch is **merged into main** when every commit it points to is also reachable from main, in other words, when main's history contains the branch's tip.

```replay
title: Merged and unmerged branches
show: graph
setup: init; commit "Base"; git branch old-fix; git switch -c spike; commit "Try a new layout"; git switch main; commit "Add footer"
step: git branch --merged | old-fix points at "Base", which is in main's history, so it counts as merged. spike has a commit main does not have.
step: git branch -d old-fix | Safe delete succeeds: no work is lost.
step: git branch -d spike | Refused: spike's commit would become unreachable. Use -D only if you really mean it.
```

## analogy | Labels on a whiteboard

Branches are sticky notes on a whiteboard of commits. Renaming rewrites the note. Deleting removes the note. `-d` checks that every commit the note marks is also covered by another note (usually main) before removing it; `-D` peels it off regardless.

## team | Branch hygiene

- **Delete branches after merging.** GitHub can do it automatically when a pull request merges, and offers a "Delete branch" button.
- **Rename `master` to `main`**: `git branch -m master main` (plus a few steps on GitHub, covered later).
- **Naming conventions** make `git branch` readable: `feature/…`, `fix/…`, `chore/…`, `release/…`.
- Remote branches are cleaned up separately (`git push origin --delete`, `git fetch --prune`), in the Remotes realm.

## traps | Management traps

**`-D` on the wrong branch.** Force-delete skips the safety check. The reflog can recover it, but it is easier not to need that.

**Deleting the current branch.** Git refuses. Switch first.

**Renaming a branch others use.** Renaming is local. Teammates and the remote still have the old name until you push the new name and delete the old one.

## lab | Spring-clean the branches

A project has accumulated branches. Find out which ones are merged, delete those safely, keep the unmerged work, and fix a badly named branch.
