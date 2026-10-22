## brief | Bad Friday

**The scenario.** It is Friday afternoon at *Pinecone*, a small company that sells a recipe app. You inherited a messy local repository from a colleague who left in a hurry. Before the weekend, you must leave it in a clean, correct state.

Here is what you know:

- A commit on `main` from last week introduced a bug (it set the servings calculation to divide by zero). Other people's work came after it, and `main` has already been pushed and pulled by the whole team.
- Your colleague's last local commit (not pushed) has a typo in its message and is missing a file that is sitting untracked in the folder.
- Your colleague deleted a branch called `ingredient-search` that held unpushed work the product manager now wants.
- There is also a throwaway "debug" commit on top that must disappear, but it was never pushed.

Plan before you act: which undo is right for **shared** history, and which for **local** history?

| Situation | Tool |
|---|---|
| Undo a pushed commit | `git revert` |
| Fix the last unpushed commit | `git commit --amend` |
| Drop unpushed commits | `git reset` |
| Recover deleted or "lost" work | `git reflog`, `git branch <name> <id>` |
| Find the bad commit | `git log -S`, `git log --grep`, `git show` |

## recap | What Time Travel gave you

- Name any commit: ids, `HEAD~n`, `HEAD^2`, branches, tags, `HEAD@{n}`.
- Search history with `git log` filters: `--author`, `--since`, `--grep`, `-S`, `-- path`.
- Visit the past with `git switch --detach` / `git checkout <commit>`; save experiments with `git switch -c`.
- `git commit --amend` replaces the last commit.
- `git reset --soft | --mixed | --hard` moves the branch back with increasing force.
- `git revert` undoes safely by adding an inverse commit.
- `git reflog` remembers every position: committed work is almost never truly lost.

**The rule that ties it together:** rewrite only history that is still private to you. Once it is shared, add new commits instead.

## lab | Leave the repo clean before the weekend
