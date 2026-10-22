## story | Both sides moved

While Ana built `feature/reviews`, her teammates merged two other changes into `main`. When she merged, git could not just slide a label: both branches had new commits since they split.

```term
$ git switch main
$ git merge feature/reviews
Merge made by the 'ort' strategy.
 reviews.js | 20 ++++++++++++++++++++
 1 file changed, 20 insertions(+)
```

Git found the **common ancestor** (the commit where the branches split), worked out what each side changed since then, combined both sets of changes, and recorded the result in a new **merge commit** with two parents.

## model | Base, ours, theirs

A three-way merge compares three snapshots:

| Name | What it is |
|---|---|
| **base** | the common ancestor, where the branches split |
| **ours** | the tip of the branch you are on (HEAD) |
| **theirs** | the tip of the branch you are merging in |

For each file and each region of lines:

- changed only in ours → keep ours,
- changed only in theirs → take theirs,
- changed in both, identically → keep it,
- changed in both, differently → **conflict** (next lesson).

```replay
title: A three-way merge creates a merge commit
show: graph
setup: init; commit "Create shop"; git switch -c feature/reviews; commit "Add review form"; commit "Add star ratings"; git switch main; commit "Add footer"; commit "Fix header link"
step: git merge --no-edit feature/reviews | Both branches have new commits, so git combines them and records a merge commit with two parents.
step: git log --oneline --graph | The graph shows the two lines of work joining.
```

The merge commit's first parent is the branch you were on (main); the second parent is the branch you merged. That ordering is what `HEAD^1` vs `HEAD^2` refer to.

## commands | Merge options

```term
$ git merge feature/reviews              # merge; opens the editor for the message if a merge commit is needed
$ git merge --no-edit feature/reviews    # accept the default message ("Merge branch 'feature/reviews'")
$ git merge --no-ff feature/reviews      # force a merge commit even when ff is possible
$ git merge -m "Merge reviews feature" feature/reviews
$ git log --oneline --graph              # see the shape of history
$ git log --first-parent --oneline       # only main's own line (one entry per merged feature)
$ git revert -m 1 <merge-commit>         # undo a whole merged feature (keep parent 1)
```

## analogy | Merging two edits of a document

Two editors each received a copy of the same chapter (the base). One rewrote the introduction; the other fixed typos in the conclusion. A sensible publisher compares both copies with the original: different parts changed, so both edits can go into the final version. Only if both editors rewrote the **same** paragraph differently does the publisher need to ask someone to decide.

## team | Merge commits in practice

- On GitHub, the default "Create a merge commit" button produces exactly this kind of commit for a pull request.
- `--no-ff` merges keep each feature grouped: `git log --first-parent` reads like a list of features.
- A bad feature can be undone as one unit: `git revert -m 1 <merge>`.
- Some teams dislike merge commits ("railroad tracks") and prefer rebasing or squashing; you will compare the approaches in the Rewriting History realm.

## traps | Three-way traps

**Merging with uncommitted changes.** Git refuses if the merge would touch files you have modified. Commit or stash first.

**Forgetting `--no-edit`** opens the editor. In a real terminal that may be Vim; save and quit to accept the default message.

**Thinking a merge copies commits.** It does not. The feature's commits stay exactly as they were; the merge commit just joins the two histories.

## lab | Both sides moved

Main and a feature branch have both moved on. Merge them, read the graph, and explore the two parents of the merge commit.
