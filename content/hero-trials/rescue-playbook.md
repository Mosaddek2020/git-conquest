## story | The calm engineer

Every team has one: the engineer who, when someone says "I think I broke git", walks over with a coffee and says "show me". They are not smarter than everyone else. They have simply learned three facts:

1. **Committed work is almost never lost.** The reflog and other clones remember it.
2. **Most disasters are one of a handful of patterns**, each with a known fix.
3. **The first move is to stop and look**: `git status`, `git log --oneline --graph --all`, `git reflog`. Never panic-type `--force` or `rm -rf`.

This lesson turns you into that engineer.

## model | The rescue decision map

```diagram
undo-map
```

| Situation | Shared already? | Fix |
|---|---|---|
| Uncommitted edit you regret | no | `git restore <file>` |
| Staged something by mistake | no | `git restore --staged <file>` |
| Last commit wrong (message, missing file, extra file) | no | `git commit --amend` |
| Commits on the wrong branch | no | `git branch <right>` then `git reset --hard <before>` on the wrong one (or cherry-pick) |
| A bad commit | **yes** | `git revert <commit>` |
| A bad merge | **yes** | `git revert -m 1 <merge>` |
| "Lost" commits after reset, rebase, amend, deleted branch, detached HEAD | either | `git reflog` → `git branch rescue <id>` |
| Remote branch overwritten by someone's force push | yes | anyone's clone that still has the commits can restore it: push from there |
| Secret committed | maybe | **rotate it**, then remove it (amend if unpushed; otherwise rewrite with `git filter-repo` and coordinate) |

## commands | The first-response kit

```term
$ git status                       # where am I, what's in progress?
$ git log --oneline --graph --all  # the shape of things
$ git reflog                       # where have I been?
$ git branch backup-before-fix     # cheap insurance before any risky fix
$ git merge --abort | git rebase --abort | git cherry-pick --abort
$ git switch -c rescue <id>        # give lost commits a name
$ git revert -m 1 <merge>          # undo a shared merge
$ git rm --cached big-file.zip && git commit --amend --no-edit   # drop a file from the last unpushed commit
```

> [!TIP]
> Before any fix you are unsure of, create a backup branch: `git branch backup`. It costs nothing and turns every experiment into an undoable one.

## analogy | An emergency room triage card

Emergency doctors do not improvise from scratch. They triage (how bad, how urgent, who else is affected), then follow a protocol for that kind of injury. Git rescues work the same way: first ask "is it committed?" and "is it shared?", then apply the matching protocol.

## team | A healthy incident culture

- **Say it early.** "I force-pushed main by mistake" at minute one is easy to fix; at hour three, five people have built on the broken state.
- **Blameless reviews.** Ask what made the mistake possible (missing protection? confusing alias?) and fix that.
- **Prevention beats heroics.** Branch protection, `--force-with-lease`, hooks and CI remove whole classes of disasters.

## traps | Rescue traps

**Fixing in panic.** A second, hasty `reset --hard` on top of the first makes the reflog harder to read. Breathe, look, then act.

**Rewriting shared history to hide a mistake.** It creates a bigger one.

**Assuming GitHub has a reflog for you.** Recovery happens on a machine that still has the commits: yours or a teammate's.

## lab | Five incidents, one afternoon

Work through five realistic incidents in one repository, choosing the right protocol each time. Nothing that was committed should be lost by the end.
