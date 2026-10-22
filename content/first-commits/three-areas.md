## story | Two changes, one commit

Sam is fixing a bug in an app's login page. While in there, he also starts redesigning the footer, but the footer is only half done when the bug fix is ready.

Sam wants to save the bug fix **now**, as one clean change the team can review and ship, and keep working on the footer without including it.

Many version control systems would force Sam to save everything at once. Git gives him a middle step: he can **pick** which changes go into the next commit.

```term
$ git status
Changes not staged for commit:
	modified:   login.js
	modified:   footer.css
$ git add login.js
$ git commit -m "Fix login when the password contains a space"
```

Only `login.js` went into the commit. `footer.css` is still modified, waiting. This middle step is called the **staging area**, and it is the most important idea in this realm.

## model | Working directory, staging area, repository

```diagram
three-areas
```

Git keeps your project in three places at once:

1. **Working directory**: the actual files on disk. You edit these.
2. **Staging area** (also called **the index**): a draft of the next commit. `git add` copies a file's current content here.
3. **Repository**: the permanent history inside `.git`. `git commit` turns the staging area into a new commit.

Every file you see is in one of these states:

| State | Meaning | Shown by `git status` as |
|---|---|---|
| Untracked | Git has never been told about this file | `Untracked files:` (red) |
| Modified | Tracked, changed since the last commit, not staged | `Changes not staged for commit:` (red) |
| Staged | The change is in the staging area, ready to commit | `Changes to be committed:` (green) |
| Unmodified | Same as the last commit | not listed at all |

Watch a file travel through the areas:

```replay
title: One file through the three areas
show: graph,areas
setup: init
step: echo "# Travel log" > README.md | A new file appears in the working directory. Git sees it but does not track it: it is untracked.
step: git add README.md | git add copies the file's current content into the staging area. It is now staged as a new file.
step: git commit -m "Start the travel log" | git commit turns the staging area into a permanent snapshot. The repository now has its first commit.
step: echo "Day 1: Lisbon" >> README.md | Editing the file changes only the working directory. The staging area and repository still hold the old version, so the file is modified.
step: git add README.md | Staging again copies the new content into the staging area.
step: git commit -m "Add the first day" | A second commit. Each commit links to the one before it.
```

## analogy | Packing a parcel

Think of shipping a parcel:

- Your **room** is the working directory: things are scattered everywhere, some finished, some not.
- The open **box** on the table is the staging area. You choose what to put in it with `git add`.
- **Sealing and posting** the box is `git commit`. Once posted, the parcel and its label (the commit message) are permanent.

You can put an item in the box and take it out again before sealing (`git restore --staged`). You can keep adding items over an afternoon. Nothing is shipped until you seal it. And if you change an item after putting it in the box, the box still holds the old version until you put the new one in.

## commands | status and add

```term
$ git status            # the command you will run more than any other
$ git status -s         # short form: two columns, staged | unstaged
$ git add file.txt      # stage one file
$ git add src/          # stage everything inside a folder
$ git add .             # stage every change in this folder and below
$ git add -A            # stage every change in the whole repository, including deletions
```

The short format packs a lot into two letters:

```term
$ git status -s
A  README.md      ← A in the left column: new file, staged
 M app.js         ← M in the right column: modified, not staged
MM style.css      ← staged, then modified again
?? notes.txt      ← untracked
```

Left column = staging area compared to the last commit. Right column = working directory compared to the staging area.

> [!TIP]
> Run `git status` before every `git add` and every `git commit`. It costs nothing and it is how professionals avoid committing the wrong thing.

## team | Why teams love the staging area

- **Focused commits.** A reviewer can understand "Fix login when the password contains a space" in thirty seconds. A commit called "fix login + footer redesign + typo" takes much longer and is harder to undo safely.
- **Undo precision.** If the footer redesign causes a bug next month, the team can revert that commit without touching the login fix.
- **Reviewing yourself.** Staging is a natural checkpoint: `git status` and `git diff --staged` show exactly what you are about to share. Many embarrassing commits (passwords, debug prints, huge files) are caught right here.

## traps | Staging surprises

**"I edited the file after `git add`, so the edit is staged."** No. `git add` copies the content *at that moment*. Edit again and you must add again. `git status` will show the file in both lists (`MM`).

**`git add .` adds more than you think.** It stages everything under the current folder, including new files you forgot about. Check `git status` first. (A `.gitignore` file, coming soon, keeps junk out.)

**Untracked files are invisible to commits.** A brand-new file is not included in any commit until you `git add` it, even with `git commit -a`.

**Empty folders.** Git tracks files, not folders. An empty folder never shows up. People put a placeholder file like `.gitkeep` in folders they need to exist.

## lab | Pack the first parcel

The travel blog has a few files already, but nothing has been committed. Practise moving files between the areas, and watch the **Three areas** panel after every command. You only need `git status`, `git add` and `git commit` for this lab.
