## story | "fixed stuff"

When Priya joined a payments team, she was asked to find out why refunds sometimes took two days. She opened the history of the refunds module:

```term
$ git log --oneline -- refunds/
c41e9a2 fixed stuff
88b0d1e more changes
5aa2f03 wip
1d9e774 update
```

Four commits, four useless messages. She had to open each one and read every line to understand what happened.

In the payments service next door, the history read like a story:

```term
$ git log --oneline -- payouts/
e8f0c11 Retry failed payouts after 15 minutes instead of 24 hours
7b2d5a9 Log the bank's error code when a payout is rejected
40c8e7e Add payout status to the merchant dashboard
```

She found the answer there in under a minute. A commit message is a note to your future self and your teammates. It costs ten seconds to write well and saves hours later.

## commands | git commit

```term
$ git commit -m "Add packing list for Japan"     # commit what is staged, with a message
[main 3f2a9c1] Add packing list for Japan
 1 file changed, 12 insertions(+)
 create mode 100644 japan/packing.md
```

The output tells you the branch (`main`), the new commit's short id (`3f2a9c1`), its message, and a summary of what changed.

| Command | Effect |
|---|---|
| `git commit -m "msg"` | Commit the staging area with a one-line message |
| `git commit -m "Title" -m "Body"` | Two `-m` options: a title line, then a longer explanation |
| `git commit` | Opens your editor to write the message (save and close to commit) |
| `git commit -am "msg"` | Stage every **tracked** modified file, then commit. New files are not included. |
| `git commit --amend` | Replace the last commit. You will master this in the Time Travel realm. |

If nothing is staged, git refuses:

```term
$ git commit -m "Update"
On branch main
Changes not staged for commit:
	modified:   index.html

no changes added to commit (use "git add" and/or "git commit -a")
```

## model | What a commit is

```diagram
commit-anatomy
```

A commit is a small record that points at a full snapshot of the staging area, plus metadata: author, committer, timestamps, the message, and the id of its **parent** commit. Its id is the SHA-1 hash of all of that.

Because each commit names its parent, commits form a chain going back to the very first commit (the *root commit*, which has no parent):

```replay
title: Commits link to their parents
show: graph
setup: init
step: commit "Create blog skeleton" | The root commit has no parent.
step: commit "Add Lisbon post" | The second commit records the first as its parent.
step: commit "Add Porto post" | And so on. The label main always points at the newest commit on the branch.
```

Commits are **immutable**. You can never change a commit; "editing" one (amend, rebase) really creates a new commit with a new id and moves the branch label to it.

## analogy | Entries in a ship's log

A captain's log has one entry per watch: the time, who wrote it, what happened, and it follows the previous entry. Nobody rips pages out. When something goes wrong, the investigators read the log in order.

Good log entries say what happened and why: *"Changed course to 270° to avoid a storm cell."* Bad entries say *"stuff"*. A commit message is a log entry for your project.

## team | Writing messages your team will thank you for

The widely used convention:

```text
Short summary in the imperative, under ~50 characters

Optional body after a blank line, wrapped at ~72 characters.
Explain WHY the change was needed and anything surprising about
the approach. The diff already shows WHAT changed.

Fixes #142
```

- **Imperative mood**: "Add search box", not "Added search box" or "Adds search box". Read it as "If applied, this commit will *add search box*."
- **One logical change per commit.** If your message needs the word "and", consider two commits.
- **Reference issues** ("Fixes #142") so GitHub links them.
- Many teams also use **Conventional Commits**: `feat: add search box`, `fix(auth): handle expired tokens`, `docs: explain setup`. You will meet them in the Team Workflows realm.

| Weak message | Strong message |
|---|---|
| fixed bug | Fix crash when a cart is empty at checkout |
| changes | Rename "Buy" button to "Add to cart" |
| wip | Add draft of the pricing page (not linked yet) |
| update README | Document how to run the tests locally |

## traps | Commit pitfalls

**Stuck in the editor.** `git commit` without `-m` opens an editor. If that editor is Vim, you may feel trapped: press {kbd:Esc}, type `:wq` and press {kbd:Enter} to save and quit. Or configure a friendlier editor (`core.editor`). In this simulator the editor is a panel with Save and Cancel buttons.

**`-am` does not add new files.** `git commit -am` only stages files git already tracks.

**Committing secrets.** Passwords and API keys in a commit stay in history forever, even if a later commit deletes them. Check `git status` and `git diff --staged` before committing.

**Giant commits.** A commit that touches 40 files for 5 different reasons is almost impossible to review or revert. Commit small and often.

## lab | Commit like a professional

You will make several commits for the travel blog, including one with a title and a body, and one written in the editor. Aim for clear, imperative messages: the lab checks the shape of your messages.
