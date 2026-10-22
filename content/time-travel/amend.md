## story | The forgotten file

Leo committed his new search feature, looked at the result and winced:

```term
$ git commit -m "Add serach to the product page"
[main 3e1f0a2] Add serach to the product page
 1 file changed, 40 insertions(+)
$ git status
Untracked files:
	search.css
```

A typo in the message, and he had forgotten to add the stylesheet. He had not pushed yet, so he fixed both in one move:

```term
$ git add search.css
$ git commit --amend -m "Add search to the product page"
[main 9b77c40] Add search to the product page
 2 files changed, 58 insertions(+)
```

The history now shows one clean commit, as if the mistake never happened. Notice the id changed from `3e1f0a2` to `9b77c40`: amend does not edit a commit, it **replaces** it.

## model | Amend replaces the last commit

```replay
title: --amend swaps the tip commit for a new one
show: graph
setup: init; commit "Add product page"; commit "Add serach"
step: git commit --amend -m "Add search" | A new commit replaces the old tip. main now points to it. The old commit is no longer on any branch (it fades out), though the reflog still remembers it.
```

`git commit --amend` takes the **current staging area** and the parent of the last commit, and creates a new commit from them. So it can:

- change the message (`-m "new"` or edit it in the editor),
- add forgotten changes (stage them first),
- remove a file from the last commit (`git rm --cached file`, then amend),
- keep the message unchanged (`--no-edit`).

The old commit is not destroyed immediately. It just stops being part of the branch.

## commands | Amend recipes

```term
$ git commit --amend -m "Better message"   # fix only the message
$ git add forgotten.css
$ git commit --amend --no-edit             # add a file, keep the message
$ git commit --amend --author="Leo Park <leo@example.com>"   # fix the author
$ git commit --amend                       # open the editor with the old message
```

## analogy | Reprinting the last page

Amend is like reprinting the last page of a document before you have handed it in. The new page replaces the old one in the binder. But if you already gave a copy to a colleague, they hold the old page, and now the two binders disagree.

## team | The one rule

**Amend only commits you have not pushed.** Once a commit is on a shared branch, teammates may have built on it. Replacing it means your history and theirs no longer match: your next push is rejected, and if you force it, you overwrite their view of history.

On your **own** feature branch, before anyone else uses it, amending is common and fine (you will then need `git push --force-with-lease`, covered in the Remotes realm).

## traps | Amend traps

**Amending a pushed commit on `main`.** Don't. Make a new commit instead.

**Accidentally amending.** You meant a new commit but typed `--amend`: the previous commit's content is merged into the new one. The reflog (later in this realm) can get the old commit back.

**Expecting amend to touch older commits.** It only replaces the very last commit. For older ones you need interactive rebase (Rewriting History realm).

## lab | Fix it before anyone sees

You just made a commit with a typo in the message and a forgotten file, and then another small slip. Repair the last commit with amend, without creating extra commits.
