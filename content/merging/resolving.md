## story | The conflict that needed both

The conflict in Chen's menu was simple: one line, one decision. Two weeks later a harder one arrived: three files, one of them deleted on the other branch. Chen worked through it methodically:

```term
$ git status
Unmerged paths:
	both modified:   menu.html
	both modified:   prices.json
	deleted by them: specials.html
```

For `menu.html` she combined both sides by hand. For `prices.json` she took the other branch's version entirely. For `specials.html` she agreed with the deletion. After each decision, `git add` (or `git rm`) marked the file resolved, and a final `git commit` concluded the merge.

## commands | The resolution workflow

```term
$ git status                         # 1. list conflicted files
$ edit menu.html                     # 2a. edit: keep what you want, delete ALL markers
$ git checkout --theirs prices.json  # 2b. or take one side's whole file
$ git checkout --ours config.yml     #     (--ours = the branch you are on)
$ git rm specials.html               # 2c. or accept a deletion
$ git add menu.html prices.json      # 3. mark resolved
$ git status                         # 4. "All conflicts fixed but you are still merging"
$ git commit --no-edit               # 5. conclude the merge (or: git merge --continue)
```

Resolving means making the file contain **exactly what it should contain after the merge**. That might be your side, their side, both, or something new that combines the ideas.

## model | What "resolved" means to git

During a conflicted merge, git keeps up to three versions of each conflicted file in the staging area (base, ours, theirs). `git add <file>` replaces them with the single version from your working directory, which tells git *"this is the answer."* Git does not check that you removed the markers; that part is your job.

```replay
title: Resolve, add, commit
show: graph,areas
setup: init; commit "Add menu" menu.txt; git switch -c promo-lunch; sed -i "s/Add menu/Lunch: 14 dollars/" menu.txt; git commit -qam "Lunch promo price"; git switch main; sed -i "s/Add menu/Lunch: 16 dollars/" menu.txt; git commit -qam "Raise lunch price"; git merge promo-lunch
step: echo "Lunch: 16 dollars (14 on Mondays)" > menu.txt | Write the version you actually want, with no markers.
step: git add menu.txt | Adding marks the conflict as resolved.
step: git commit --no-edit | The merge commit is recorded with both parents.
```

## analogy | The mediator's final draft

Resolving a conflict is writing the final draft after a mediation. You are not choosing "the winner" by default; you are writing the version both parties would sign. Sometimes that is one side's wording, sometimes both, sometimes a new sentence. Once written, you hand it in (`git add`) and the agreement is signed (`git commit`).

## team | Resolving well

- **Understand both changes before editing.** `git log --merge -p` shows the commits involved.
- **Ask the other author** when intent is unclear. A two-minute chat beats a wrong guess.
- **Build and test** after resolving: a clean text merge can still be broken code.
- **Use a merge tool** if you like visual diffs: VS Code shows "Accept Current / Incoming / Both" buttons above each conflict; `git mergetool` launches configured tools.
- **`--ours` and `--theirs`** are perfect for generated files, but dangerous for code you have not read.

## traps | Resolution traps

**Leaving a marker behind.** Search before committing: `git grep -n "<<<<<<<"`.

**`--ours`/`--theirs` swap meaning during rebase.** In a rebase, "ours" is the branch you are rebasing onto. You will meet this in the Rewriting History realm.

**Resolving by deleting both sides.** It removes the conflict and the content. Make sure the result is what you meant.

**Forgetting to commit.** Until you commit, the merge is unfinished; the prompt still says MERGING.

## lab | Resolve a three-file conflict

A merge conflicts in three different ways. Resolve each one appropriately, finish the merge, and verify that no markers remain.
