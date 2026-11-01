## story | One giant PR, or three small ones?

Diego built refunds in one branch: a model, an API on top of it, and a button on top of that. 1,400 lines. The review sat untouched for a week; nobody had a free afternoon.

His lead suggested a **stack**: three branches, each built on the one below, and three pull requests, each reviewing one idea. The model PR got approved in an hour. The API PR was reviewed the next morning. Meanwhile Diego kept working on the button.

The catch is upkeep. When `main` moves, or a reviewer asks for a change in the bottom branch, every branch above it has to move too. Git 2.38 added exactly the tool for this: **`--update-refs`**.

## model | Branches that move together

```diagram
stacked-prs
```

- Each branch in the stack starts where the one below ends. Each PR's **base** is the branch below it, so its diff shows only its own commits.
- `git rebase --update-refs <upstream>`, run from the **top** branch, rewrites the whole stack and moves every branch that pointed into it. Set `rebase.updateRefs = true` once and every rebase does this.
- A fix for a lower commit: commit it on top with `--fixup <commit>`, then `git rebase -i --autosquash`. Git moves the fixup into place and the `update-ref` lines in the todo list move the branches.
- When the bottom PR is **squash-merged**, main gets a brand-new commit. GitHub retargets the next PR to `main` once the merged branch is deleted, and you replay the rest of the stack with `git rebase --onto origin/main <old-bottom> <top>`.

```replay
title: One rebase moves the whole stack
show: graph
setup: init; commit "Create payments"; git switch -c refunds-model; commit "Add refund model"; git switch -c refunds-api; commit "Add refunds API"; git switch -c refunds-ui; commit "Add refund button"; git switch main; commit "Add request logging"; git switch refunds-ui
step: git rebase --update-refs main | From the top branch: every commit is replayed onto the new main, and refunds-model and refunds-api move with their commits.
step: git log --oneline --decorate | Still a clean stack: model, then API, then UI, all on top of the latest main.
```

## commands | Working a stack

```term
$ git config --global rebase.updateRefs true
$ git switch refunds-ui                           # always work from the top
$ git fetch && git rebase origin/main             # moves all three branches
$ git push --force-with-lease origin refunds-model refunds-api refunds-ui

$ gh pr create --base main          --head refunds-model --title "Refund model"
$ gh pr create --base refunds-model --head refunds-api   --title "Refunds API"
$ gh pr create --base refunds-api   --head refunds-ui    --title "Refund button"

$ git commit -a --fixup refunds-model             # review fix for the bottom commit
$ git rebase -i --autosquash origin/main          # todo shows update-ref lines

$ gh pr merge 1 --squash --delete-branch          # GitHub retargets PR 2 to main
$ git fetch && git rebase --onto origin/main refunds-model refunds-ui
```

The interactive todo list for a stack looks like this. You can move the `update-ref` lines if you want a branch to end somewhere else:

```
pick 1a2b3c4 Add refund model
fixup 9f8e7d6 fixup! Add refund model
update-ref refs/heads/refunds-model

pick 2b3c4d5 Add refunds API
update-ref refs/heads/refunds-api

pick 3c4d5e6 Add refund button
```

## analogy | Stacked boxes on a trolley

Moving a stack of boxes one at a time means three trips and a wobbly tower. Put the whole stack on a trolley and push once. `--update-refs` is the trolley: one rebase, and every box (branch) arrives in the same order it left.

## team | Stacks in practice

- **Keep each PR to one idea** and say "Part 2 of 3, based on #41" in its description.
- **Review bottom up, merge bottom up.** Merging the top first would pull the lower, unreviewed commits into main with it.
- **Automatic head-branch deletion** (`gh repo edit --delete-branch-on-merge`) makes GitHub retarget the next PR as soon as one merges.
- Tools such as `git town`, Graphite, `spr` or `ghstack` automate stacks further; they all build on the same git operations you practise here.

## traps | Stack traps

**Rebasing a middle branch on its own.** Everything above it is left pointing at the old commits. Always rebase from the top, with update-refs.

**Plain rebase after a squash merge.** `git rebase origin/main` tries to replay the old model commit again (with conflicts or a duplicate). Use `--onto origin/main <old-bottom>` so only the commits above it are replayed.

**`--force` instead of `--force-with-lease`.** With three branches and teammates leaving review commits, the lease is what stops you overwriting their work.

**Forgetting the base when opening a PR.** A PR against `main` for the middle branch shows the bottom branch's commits too, which confuses reviewers.

## lab | Refunds, in three parts

In `~/payments` you have a three-branch stack: `refunds-model`, `refunds-api` and `refunds-ui`, and PR #1 for the model. `main` has moved. Turn on update-refs, rebase and push the stack, open the stacked PRs, address a review on the bottom commit from the top of the stack, merge PR #1, then move the rest of the stack onto the squashed commit.
