## story | "Can you look at this right now?"

Omar was in the middle of a messy change, with half-edited files everywhere, when his lead pinged him: production checkout was broken, could he check `main` immediately?

His changes were not ready to commit. Switching branches would either carry the mess along or be refused. He typed:

```term
$ git stash
Saved working directory and index state WIP on feature/reviews: 3c1d0a2 Add review form
$ git switch main
...investigates, fixes, commits...
$ git switch feature/reviews
$ git stash pop
```

`git stash` put his unfinished work on a shelf, gave him a clean working directory, and `git stash pop` put it all back afterwards.

## model | A stack of shelved changes

```diagram
stash
```

`git stash` takes your **uncommitted changes to tracked files** (staged and unstaged), saves them in a special commit, and resets your working directory to match HEAD.

- Stashes form a **stack**: `stash@{0}` is the newest.
- `pop` applies the newest stash **and removes it** from the stack. `apply` applies but keeps it.
- Untracked files are **not** stashed unless you add `-u`.
- A stash can be applied on **any** branch, not just the one it came from.

```replay
title: Stash, switch, come back
show: graph,areas
setup: init; commit "Add review form" reviews.js; echo "stars: 5" >> reviews.js
step: git stash | The edit is shelved. The working directory is clean, so switching is safe.
step: git switch -c hotfix | Do the urgent work on another branch.
step: commit "Fix checkout total" checkout.js | The hotfix is committed.
step: git switch main | Back on the original branch (in a real project, your feature branch).
step: git stash pop | The shelved edit returns and the stash is removed.
```

## commands | Stash recipes

```term
$ git stash                       # shelve tracked changes
$ git stash -u                    # also shelve untracked files
$ git stash push -m "half-done reviews"   # with a description
$ git stash list                  # see the stack
$ git stash show -p stash@{1}     # look inside one stash
$ git stash pop                   # apply the newest and remove it
$ git stash apply stash@{2}       # apply a specific one, keep it
$ git stash drop stash@{0}        # delete one
$ git stash clear                 # delete all (careful)
$ git stash branch new-branch     # create a branch from where the stash was made and apply it there
```

If applying a stash conflicts with changes made since, you resolve the conflict like a merge conflict; the stash is kept so nothing is lost.

## analogy | The shelf next to the desk

Your desk is the working directory. A visitor needs the desk urgently. You sweep your half-finished papers into a labelled folder and put it on the shelf (`stash`). The desk is clear. When the visitor leaves, you take the top folder off the shelf and spread it out again (`pop`). The shelf can hold several folders, newest on top.

## team | Stash or commit?

Stash is perfect for **minutes or hours**. For anything longer, a commit is safer and easier to find:

```term
$ git commit -am "WIP: reviews form (not ready)"   # on your own branch
...later...
$ git reset --soft HEAD~1                           # turn it back into uncommitted changes
```

Stashes are local, easy to forget, and do not show up in `git log` or on GitHub. Many developers prefer "WIP commits on a feature branch" for anything that might outlive the day.

## traps | Stash traps

**Forgetting untracked files.** A brand-new file stays behind after `git stash`. Use `git stash -u`.

**Stash amnesia.** Weeks later, `git stash list` shows ten mysterious entries. Use `-m` with a description, and pop or drop promptly.

**`git stash clear` by accident.** The stashes become unreachable commits. Recovery is possible but painful.

**Popping on the wrong branch.** It works, which is exactly the problem. Check `git branch` first.

## lab | The urgent interruption

You are halfway through a feature when an urgent fix is needed on main. Shelve your work, fix, and come back without losing anything, including a brand-new file you have not committed yet.
