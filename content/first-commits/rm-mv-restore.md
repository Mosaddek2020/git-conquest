## story | The deleted stylesheet

Ravi was tidying up a project and deleted `old-styles.css`. Ten minutes later the site looked broken: one page still used it. Before git, this meant digging through backups. Ravi typed one command:

```term
$ git restore old-styles.css
```

The file was back, exactly as it was in the last commit.

Removing, renaming and restoring files are everyday tasks. Git can do all of them, and it helps to know how each one looks from git's point of view.

## model | Deletes and renames are changes too

Git compares the working directory with the staging area and the last commit. So:

- **Deleting** a tracked file is a change ("deleted: old-styles.css") that you stage and commit like any other.
- **Renaming** a file looks like a deletion of the old name plus a new untracked file, until both halves are staged; then git recognises it as a **rename** because the content is the same.
- **Restoring** copies a version from the staging area or a commit back over your working file.

```replay
title: Renaming a file, two ways
show: graph,areas
setup: init; commit "Add notes" notes.txt
step: mv notes.txt journal.txt | A plain mv: git sees notes.txt deleted and journal.txt untracked.
step: git add -A | After staging both sides, git recognises a rename (same content, new name).
step: git commit -m "Rename notes to journal" | Committed. git mv would have done the mv and the staging in one step.
```

## commands | rm, mv, restore

```term
$ git rm old.css                 # delete the file AND stage the deletion
$ git rm --cached secrets.txt    # stop tracking, keep the file on disk
$ git rm -r old-folder/          # remove a whole folder
$ git mv draft.md post.md        # rename and stage in one step
$ git restore app.js             # discard unstaged edits: back to the staged version
$ git restore --staged app.js    # unstage (keep the edit in the working directory)
$ git restore --source=HEAD~2 app.js   # bring back the version from two commits ago
$ git restore .                  # discard every unstaged change (careful!)
```

| You want to… | Command |
|---|---|
| Throw away edits you have not staged | `git restore <file>` |
| Take a file out of the staging area | `git restore --staged <file>` |
| Undo a `git rm` that is not committed yet | `git restore --staged <file>` then `git restore <file>` |
| Recover a file deleted in an earlier commit | `git restore --source=<commit-before-deletion> <file>` |

> [!NOTE]
> Older tutorials use `git checkout -- <file>` and `git reset HEAD <file>` for the same jobs. They still work. `git restore` (added in Git 2.23) does one thing and is clearer.

## analogy | The archive and the draft

Think of the last commit as a signed, archived copy of every document, and your working directory as drafts on your desk. `git restore file` says "throw away my draft of this document and give me a fresh copy from the archive." It cannot fail to find the archived copy, but it **does** destroy your draft, so be sure the draft is worthless.

## traps | Restore with care

**`git restore` destroys uncommitted edits.** There is no undo for discarding changes that were never committed or staged. If unsure, `git stash` first (you will meet it in the Branching realm) or copy the file.

**`git rm` vs `rm`.** Plain `rm` deletes the file; you still need to stage the deletion (`git add -A` or `git rm`). `git rm` does both.

**`git rm --cached` is what you want for secrets and junk**, not `git rm`, which would also delete your local copy.

**Renaming case only** (`readme.md` to `README.md`) can confuse case-insensitive file systems (Windows, macOS). Use `git mv` for that.

## lab | Spring cleaning

The blog has an outdated file, a badly named file, and a file you are about to break by accident. Use git's file commands, then commit the clean-up.
