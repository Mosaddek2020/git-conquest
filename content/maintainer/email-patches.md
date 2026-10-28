## story | No pull requests here

Kim wanted to fix a bug in a small but famous C library. She looked for the *Pull requests* tab: there was none. The README said *"Send patches to the mailing list. See SubmittingPatches."*

Many of the most important projects (the Linux kernel, git itself, QEMU, PostgreSQL's patch flow) still work by email. A contribution is a series of **patch files**, each carrying the author, date, message and diff of one commit. Reviewers reply inline. The maintainer applies the final version with one command, and the history credits Kim as the author.

## model | A commit as an email

```diagram
patch-flow
```

```
From 9e8d7c6… Mon Sep 17 00:00:00 2001
From: Kim Park <kim@example.org>
Date: Tue, 3 Mar 2026 10:12:00 +0000
Subject: [PATCH 1/2] docs: explain timeouts

Signed-off-by: Kim Park <kim@example.org>
---
 docs/timeouts.md | 4 ++++
 ...diff...
```

| Command | Role |
|---|---|
| `git format-patch` | turns commits into numbered `.patch` files |
| `git send-email` | mails them to the list |
| `git am` | (maintainer) applies a mailbox of patches as commits, keeping the author |
| `git apply` | applies a plain diff to your files, without making a commit |

**Signed-off-by** is the *Developer Certificate of Origin*: "I wrote this, or have the right to submit it". Many projects require it on every patch (`-s`).

## commands | Both sides of the list

As a contributor:

```term
$ git format-patch -s origin/main -o ~/outbox      # one file per commit, with Signed-off-by
$ git format-patch -v2 -s origin/main -o ~/outbox  # second round: [PATCH v2 1/2]
$ git send-email --to=dev@lists.example ~/outbox/*.patch
```

As a maintainer:

```term
$ git switch -c kim-docs main
$ git am -s ~/inbox/*.patch          # apply, adding your own Signed-off-by
Applying: docs: explain timeouts
error: patch failed: README.md:3
Patch failed at 0002 …
$ git am --abort                     # undo the half-applied series
$ git am -3 -s ~/inbox/*.patch       # three-way: use the blobs named in the patch
$ git log --format="%an | %cn | %s" -3   # author kept, you are the committer
```

`git am --continue` after fixing a conflict, `git am --skip` to drop one patch.

## analogy | Recipes by post

A friend posts you a recipe card: their name on top, the steps below. You can cook it exactly as written, and when someone asks, you say whose recipe it is. A patch is the card, `git am` is cooking it, and the author line keeps the credit.

## team | Etiquette on patch lists

- One logical change per patch; the series should build at every step.
- Write the cover letter (`--cover-letter`) for series of three or more.
- Reroll with `-v2`, `-v3` and say what changed (that is where range-diff helps).
- Never send attachments or HTML mail; `git send-email` sends plain text.

## traps | Patch traps

**Patch does not apply.** The maintainer's branch moved. Try `git am -3`; if it still conflicts, fix, `git add`, `git am --continue`.

**Lost authorship.** Copy-pasting a diff and committing it yourself credits you. `git am` keeps the real author.

**Forgetting sign-off.** Projects with a DCO reject patches without `Signed-off-by`. Use `-s`.

**Half-applied series.** A failed `git am` stops in the middle. Either finish (`--continue`/`--skip`) or `--abort`.

## lab | Both sides of the mailing list

In `~/tinyhttp`, send your two-commit fix to the project's list as signed-off patches. Then put on the maintainer hat: Kim's two-patch series is in `~/inbox`; apply it on a branch, recover when it does not apply cleanly, and check that Kim keeps the credit.
