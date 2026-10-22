## brief | Context-switch chaos

**The scenario.** You work on *Wayfarer*, a travel-booking site. It is Wednesday and three things land on you at once:

1. You are mid-way through `feature/price-alerts`, with uncommitted edits and one brand-new file.
2. Support reports that the booking confirmation page shows the wrong year. It needs a fix on a branch made from `main`, right now.
3. Your lead asks you to tidy the repository: delete branches that are already merged, and rename the badly named branch `newstuff` to something meaningful.

When you are done, your price-alerts work must be exactly as you left it, on its branch, and nothing anywhere may be lost.

| Need | Tools |
|---|---|
| Pause uncommitted work, including new files | `git stash -u`, `git stash pop` |
| Branch from main | `git switch main`, `git switch -c fix/…` |
| Inspect branches | `git branch -v`, `--merged`, `--no-merged` |
| Tidy | `git branch -d`, `git branch -m` |

## recap | What Branching gave you

- A branch is a 41-byte pointer to a commit. HEAD points at the current branch. Committing moves only the current branch.
- `git switch -c <name>` creates and switches; `git switch <name>` moves; switching rewrites your working directory, and git refuses if uncommitted work would be overwritten.
- `git branch -v`, `--merged`, `--no-merged`, `-m`, `-d`, `-D` manage branches. `-d` protects unmerged work.
- `git stash` shelves uncommitted work (`-u` for untracked files); `pop` restores it.

Next realm: Merging. Separate lines of work have to come back together.

## lab | Wednesday, three things at once
