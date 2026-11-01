## story | The translators always win

Every month, the translation agency delivered a branch with reviewed French text. Every month it conflicted with small wording tweaks developers had made, and every month someone spent an hour picking "theirs" in each conflict block, because the agency's wording was the one legal had approved.

Then someone noticed that git can be told the rule up front: **"when a hunk conflicts, take theirs"**. The developers' new keys still merged in, because they did not conflict. The hour became one command.

## model | Strategy versus strategy option

| You want | Command | What happens |
|---|---|---|
| Their side for every **conflicting hunk**, everything else merged normally | `git merge -X theirs translations` | clean changes from both sides survive |
| Your side for every conflicting hunk | `git merge -X ours vendor-update` | same, the other way round |
| One **file** from one side, during a conflict | `git checkout --theirs locales/fr.json` (or `--ours`), then `git add` | per-file choice |
| A merge commit that keeps **your tree exactly** | `git merge -s ours old-experiment` | the branch counts as merged; none of its changes come in |

`-X` is a **strategy option**: it tunes the normal merge. `-s ours` is a different **strategy**: it ignores the other side completely. They sound alike and do very different things.

**Ours and theirs flip during a rebase.** A rebase replays *your* commits onto the upstream, so `--ours` is the upstream and `--theirs` is the commit being replayed. `git rebase -X theirs main` means "my commits win conflicts".

```replay
title: -X theirs settles conflicts, -s ours records a merge
show: graph
setup: init; commit "Create shop" fr.json; git switch -c old-experiment; commit "Experiment" exp.txt; git switch main; git switch -c translations; commit "Agency wording" fr.json; git switch main; commit "Developer wording" fr.json; commit "New checkout key" checkout.txt
step: git merge -X theirs translations -m "Merge reviewed French" | The conflicting line in fr.json takes the agency's version; checkout.txt from main is untouched.
step: git merge -s ours old-experiment -m "Record old-experiment as merged" | A merge commit with old-experiment as a parent, but exp.txt did not come in: our tree is kept exactly.
```

## commands | Picking a side

```term
$ git merge -X theirs translations           # their side wins conflicting hunks
$ git merge -Xours vendor-update              # our side wins (no space is fine too)
$ git merge -s ours old-experiment -m "Record old-experiment as merged"

$ git merge feature                           # conflict in two files
$ git checkout --theirs package-lock.json     # take theirs for this file
$ git checkout --ours CHANGELOG.md            # keep ours for this one
$ git add package-lock.json CHANGELOG.md && git commit

$ git cherry-pick -X theirs 3f2a1b9           # also works for cherry-pick and revert
$ git rebase -X theirs main                   # in a rebase, "theirs" = your commits
```

## analogy | A standing instruction

Instead of being phoned about every disputed invoice, you give your accountant a standing instruction: "if the supplier and our records disagree on an amount, use the supplier's". Undisputed lines are booked as usual. `-X theirs` is that instruction; `-s ours` is "file it as paid without booking anything".

## team | When teams use them

- **Generated or vendored content** (translations from an agency, an upstream vendored library, API clients generated from a spec): `-X theirs` when the other side is the source of truth.
- **Lock files**: often better to take one side, then regenerate (`npm install`) and commit the result.
- **Abandoned or superseded branches**: `-s ours` records them as merged so tooling and `git branch --merged` stop nagging.
- Write the rule down (CONTRIBUTING.md) so nobody wonders why a merge took a whole side.

## traps | Side-picking traps

**Using `-X` on code where both sides matter.** It never combines two edits to the same lines; it picks one. Real logic conflicts need a person and the tests.

**Confusing `-X ours` with `-s ours`.** One keeps their clean changes, the other drops all of them.

**Forgetting the rebase flip.** In a rebase `--theirs` means *your* commit. Read the conflict markers' labels when unsure.

**Not checking afterwards.** Run the tests and `git diff HEAD~1` after a side-picking merge: you are trusting a rule, so verify it did what you meant.

## lab | The agency's French

In `~/shop-web`, the `translations` branch holds the agency-approved French text and conflicts with a developer tweak on `main`. Let the agency win the conflicting hunks without losing the developer's new key, then record the abandoned `old-experiment` branch as merged without taking any of its code.
