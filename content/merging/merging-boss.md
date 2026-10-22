## brief | Release-day merge train

**The scenario.** It is release day at *Brightside*, a small company building a fitness app. Three feature branches must land in `main` before the release:

- `feature/streaks`: no conflicts expected.
- `feature/dark-theme`: touches `settings.json`, which `main` also changed.
- `feature/workout-timer`: changes the same line of `app.js` as `feature/dark-theme`.

Your job: merge all three into `main`, resolve every conflict sensibly, keep the history honest (merge commits where branches diverged), and leave `main` clean, with every feature present and no conflict markers anywhere. Then delete the merged branches.

Think about order: merging one branch changes what the next merge sees.

| Need | Tools |
|---|---|
| Merge | `git merge <branch>`, `--no-edit` |
| Inspect | `git status`, `git diff`, `git log --oneline --graph` |
| Resolve | `edit`, `git checkout --ours/--theirs`, `git add`, `git commit` |
| Escape hatch | `git merge --abort` |
| Verify | `git grep -n "<<<<<<<"`, `git branch --merged` |

## recap | What Merging gave you

- **Fast-forward**: when the receiving branch has not moved, git just slides the label.
- **Three-way merge**: base + ours + theirs, recorded in a merge commit with two parents.
- **Conflicts** happen when both sides change the same lines differently (or edit vs delete). Git marks them with `<<<<<<<`, `=======`, `>>>>>>>`.
- **Resolve** by editing (or `--ours`/`--theirs`), then `git add`, then `git commit`. `git merge --abort` is always available.
- A clean text merge is not proof of correct code: test after merging.

## lab | Ship all three features
