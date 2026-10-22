## story | Two people, one line

At a small restaurant chain, Chen changed the lunch price on the menu page to $14 on a branch for a promotion. Meanwhile Amara changed the same line to $16 on `main` because ingredient costs had risen. When Chen merged:

```term
$ git merge promo-lunch
Auto-merging menu.html
CONFLICT (content): Merge conflict in menu.html
Automatic merge failed; fix conflicts and then commit the result.
```

Git did exactly the right thing. Both people changed the **same line** in **different** ways. Choosing automatically would mean silently throwing away one person's decision. So git stopped and asked a human.

A conflict is not an error and nothing is broken. It is git saying: *"I need you to decide."*

## model | When conflicts happen

A conflict happens only when, compared with the common ancestor (the base), **both** sides changed the **same lines** (or adjacent lines) differently, or one side edited a file the other side deleted.

| Ours | Theirs | Result |
|---|---|---|
| changed line 5 | did not touch line 5 | ours wins automatically |
| did not touch line 5 | changed line 5 | theirs wins automatically |
| changed line 5 to X | changed line 5 to X | identical: no conflict |
| changed line 5 to X | changed line 5 to Y | **conflict** |
| edited file | deleted file | **conflict** (modify/delete) |

```replay
title: How a conflict arises
show: graph
setup: init; commit "Add menu" menu.txt; git switch -c promo-lunch; sed -i "s/Add menu/Lunch: 14 dollars/" menu.txt; git commit -qam "Lunch promo price"; git switch main; sed -i "s/Add menu/Lunch: 16 dollars/" menu.txt; git commit -qam "Raise lunch price"
step: git merge promo-lunch | Both branches rewrote the same line differently. Git stops mid-merge and marks the file as conflicted.
step: git status | status lists the file under "Unmerged paths" and explains how to finish or abort.
```

## inside | Anatomy of conflict markers

Git writes both versions into the file, fenced by markers:

```diagram
conflict-anatomy
```

- Between `<<<<<<< HEAD` and `=======` is **your** side (the branch you are on).
- Between `=======` and `>>>>>>> branch-name` is **their** side (the branch being merged).
- Everything outside the markers merged cleanly.

While the merge is unfinished, the repository is in a special state: `git status` says *You have unmerged paths*, the prompt shows `MERGING`, and `git commit` refuses until every conflict is resolved.

## commands | Inspecting a conflict

```term
$ git status                  # which files are conflicted ("both modified")
$ git diff                    # the conflicting hunks
$ git log --merge --oneline   # the commits on both sides that touched the conflicted files
$ git merge --abort           # give up: back to exactly how things were before the merge
```

`git merge --abort` is always safe while a merge is in progress. Use it whenever you want to stop and think, talk to the other person, or start over.

## analogy | Two editors, one sentence

Two editors both rewrote the same sentence of an article differently. A good copy chief does not pick one at random: she puts both versions side by side and asks someone who understands the story to decide. Conflict markers are the side-by-side view.

## team | Conflicts are a people problem

- The best resolution often needs a **conversation**: "You set $14 for the promo, I set $16 for costs. Which wins?"
- Conflicts get bigger the longer branches live apart. Merge (or rebase) `main` into long branches regularly, and keep branches short.
- Formatting changes (re-indenting a whole file) cause huge conflicts. Teams use automatic formatters so everyone's code looks the same.
- Lock files (`package-lock.json`) conflict often; teams usually regenerate them instead of hand-editing.

## traps | Conflict panics

**"I broke the repository."** You did not. `git merge --abort` returns you to before the merge.

**Committing the markers.** Git will happily commit a file still containing `<<<<<<<`. Always search for markers before committing.

**Assuming a conflict-free merge is a correct merge.** Git merges text, not meaning. If one branch renamed a function and the other added a call to the old name, the merge succeeds and the code breaks. Run the tests after merging.

## lab | Meet your first conflict

Two branches changed the same line of a menu. Trigger the conflict, read the markers, inspect it, then abort cleanly. Resolving is the next lesson.
