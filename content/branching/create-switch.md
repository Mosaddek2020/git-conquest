## story | Two tasks at once

Zoe was halfway through building a "dark mode" feature when her product manager asked for a quick change: the "Contact us" email address on the homepage was wrong.

Without branches she would have to finish dark mode first, or ship a half-built dark mode with the fix. With branches:

```term
$ git switch -c dark-mode          # her feature work lives here
...commits...
$ git switch main                  # back to the clean, deployable line
$ git switch -c fix-contact-email
$ git commit -am "Fix the contact email address"
$ git switch dark-mode             # and back to the feature, untouched
```

Each piece of work has its own branch. Switching takes a second and her files change to match the branch she is on.

## commands | Create and switch

```term
$ git branch                   # list local branches (* marks the current one)
$ git branch search            # create a branch here, stay where you are
$ git switch search            # move to an existing branch
$ git switch -c search         # create AND switch (most common)
$ git switch -c hotfix main    # create from a specific starting point
$ git switch -                 # toggle back to the previous branch
```

The classic equivalents still work everywhere:

| Modern | Classic |
|---|---|
| `git switch <branch>` | `git checkout <branch>` |
| `git switch -c <new>` | `git checkout -b <new>` |
| `git switch --detach <commit>` | `git checkout <commit>` |

Branch names usually describe the work and often use a prefix: `feature/search`, `fix/login-timeout`, `docs/install-guide`, sometimes with a ticket number: `fix/PAY-142-refund-rounding`. Names cannot contain spaces.

## model | What switching does to your files

Switching branches changes three things:

1. **HEAD** now points at the other branch.
2. The **staging area** is replaced with that branch's snapshot.
3. The **working directory** is updated: files are added, changed or removed to match.

```replay
title: Files change when you switch
show: graph,areas
setup: init; commit "Add homepage" index.html; git switch -c dark-mode; commit "Add dark theme" dark.css
step: git switch main | On main, dark.css does not exist, so git removes it from the working directory.
step: git switch dark-mode | Back on dark-mode, dark.css reappears. Nothing was lost: it lives in the dark-mode commit.
```

**Uncommitted changes** are handled carefully:

- If a modified file is the **same** on both branches, your change simply comes along.
- If switching would **overwrite** your uncommitted change, git refuses:

```term
error: Your local changes to the following files would be overwritten by checkout:
	index.html
Please commit your changes or stash them before you switch branches.
Aborting
```

Commit, stash (lesson after next), or discard the change first.

## analogy | Workbenches in a workshop

A carpenter keeps several workbenches: one for the table she is building, one for a chair repair. Switching branches is walking to the other bench: the tools and half-finished pieces on each bench stay exactly where she left them. The one rule: do not carry a half-glued piece to the other bench and drop it on top of the chair. Git enforces that rule for you.

## team | Branching habits that work

- **Start every task from an up-to-date `main`**: `git switch main`, update it (Remotes realm), then `git switch -c <task>`.
- **One branch, one purpose.** Mixing two features in one branch makes review and rollback painful.
- **Short-lived branches** (days, not months) merge easily. Long-lived ones drift and conflict.
- **Do not work directly on main** if your team uses pull requests. Many teams make it impossible with branch protection.

## traps | Switching traps

**Creating a branch from the wrong place.** `git switch -c fix` starts from wherever HEAD is now, even if that is another feature branch. Switch to main first, or pass the start point: `git switch -c fix main`.

**Forgetting which branch you are on** and committing to the wrong one. Check your prompt or `git status`. (The next lesson and Rewriting History show how to move commits.)

**Untracked files follow you.** Untracked files are not on any branch, so they stay in the working directory when you switch, which can be confusing.

## lab | Two tasks, two branches

You are building a feature for a recipe website when an urgent fix comes in. Keep both pieces of work on their own branches and switch between them cleanly.
