## story | "Isn't branching expensive?"

Kwame had used an older version control system at a previous job where creating a branch copied the entire project on the server. It took minutes, so people avoided it and everyone worked on one shared line, constantly breaking each other's work.

On his first day with git, a colleague created three branches in a few seconds while explaining something else. Kwame was suspicious. "Where did all the copies go?"

```term
$ cat .git/refs/heads/feature-login
e9f1c2a7b0d34f6e8a1c5b2d9f0e7a6c3b1d4e5f
```

There are no copies. A git branch is a **tiny file containing one commit id**: 41 bytes. Creating a branch writes that file. That is why git users branch for everything, even five-minute experiments.

## model | A branch is a movable label

```diagram
branch-pointer
```

Three facts explain almost everything about branches:

1. **A branch points at one commit**: the newest commit on that line of work (its *tip*).
2. **HEAD points at the current branch.** HEAD answers "where am I?"
3. **When you commit, the current branch moves forward** to the new commit. Other branches stay where they are.

```replay
title: Commit moves only the current branch
show: graph
setup: init; commit "Create menu"; commit "Add soups"
step: git branch desserts | A new branch is just a second label on the same commit. Nothing else changes; HEAD still points at main.
step: commit "Add salads" | Committing on main moves main forward. desserts stays behind.
step: git switch desserts | Switching moves HEAD to desserts and rewrites your files to match its commit.
step: commit "Add cakes" | Now desserts moves forward. The history has split into two lines.
```

The history is a graph of commits. Branches are just names that make parts of the graph easy to find and extend. "The main branch" is not special to git: `main` is simply a branch everyone agreed to treat as the official line.

## analogy | Bookmarks in a choose-your-own-adventure book

Picture a choose-your-own-adventure book where you write new pages as you read. A branch is a **bookmark**. You can have many bookmarks, each in a different storyline. "Switching branches" means opening the book at another bookmark. Writing a new page (committing) moves the bookmark you are holding forward, while the others stay put.

Bookmarks are cheap. Losing a bookmark does not destroy the pages, though finding them again without it is harder (that is what the reflog is for).

## inside | Look at the files

In any repository:

```term
$ cat .git/HEAD
ref: refs/heads/main
$ ls .git/refs/heads
desserts  main
$ cat .git/refs/heads/desserts
4f2a91c0d1...
```

- `.git/HEAD` names the current branch.
- `.git/refs/heads/<name>` holds each branch's tip.
- Committing writes a new commit object and then updates the current branch's file.

That is the entire mechanism. (Big repositories pack refs into one file, `packed-refs`, but the idea is the same.)

## team | Why branches matter at work

Every professional team uses branches to keep work separate until it is ready:

- **One branch per feature or fix** (`feature/search`, `fix/login-timeout`): unfinished work never blocks or breaks anyone else.
- **`main` stays deployable**: only reviewed, tested work is merged in.
- **Experiments are free**: try an idea on a branch, delete it if it fails.
- **Reviews are per branch**: a pull request is a request to merge one branch into another.

## traps | Branch misconceptions

**"A branch contains files."** A branch points at a commit; the commit contains the snapshot.

**"Switching branches loses my work."** Committed work stays on its branch. Uncommitted changes either move with you or git refuses to switch (more in the next lesson).

**"Deleting a branch deletes its commits."** It deletes the label. Commits that only that branch pointed to become unreachable and are cleaned up much later.

**"main is the root of everything."** It is only a convention. Some projects call it `master`, `trunk` or `develop`.

## lab | Pull back the curtain

Explore a small repository's branches at the file level, then create a branch and watch exactly which label moves when you commit.
