## brief | Ship version one

**The scenario.** A local football club asked you for a simple website. You have been working in a plain folder, `~/club-site`, without version control (oops). Today you put it under git properly and ship version one.

The folder contains real source files, but also a downloaded library folder, a log file, a secrets file and some editor junk. The club's coach also asked for one last-minute change.

You will need everything from this realm:

| Skill | Commands |
|---|---|
| Start tracking | `git init` |
| Keep junk out | `.gitignore`, `git status --ignored` |
| Build focused commits | `git add <file>`, `git status`, `git diff --staged` |
| Write good messages | `git commit -m "Imperative summary"` |
| Inspect | `git log --oneline`, `git show` |
| Fix file mistakes | `git restore`, `git rm --cached`, `git mv` |

> [!TIP]
> The boss checks the final state of the repository, not the exact commands you type. Plan the commits before you make them.

## recap | What First Commits gave you

- `git init` turns a folder into a repository by creating `.git`, git's database.
- Every file is **untracked**, **modified**, **staged** or **unmodified**. `git add` stages; `git commit` records the staging area as a snapshot.
- A commit stores a full snapshot plus author, time, message and parent. Ids are SHA-1 hashes; commits are immutable.
- `git diff` (unstaged), `git diff --staged` (staged), `git log`, `git show` let you inspect any change.
- `.gitignore` keeps generated, personal and secret files out. It only affects untracked files.
- `git rm`, `git mv`, `git restore` handle deletions, renames and undoing edits.

Next realm: Time Travel. You will move through history and undo almost anything.

## lab | The club website goes live
