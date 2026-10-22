## story | The Friday the website broke

Farhan had been at his first developer job for three weeks. On Friday afternoon he made a "small change" to the checkout page of a busy online shop, uploaded it to the server, and went home.

By 8 pm the shop had taken zero orders. The checkout button did nothing.

His manager called. "What did you change?" Farhan was not sure. He had edited four files that week. He had a folder on his desktop called `shop_backup_tuesday`, but he had kept working after Tuesday, and he could not remember which of his edits came before or after it. Undoing everything would also throw away three days of good work.

They fixed it at 1 am by comparing files line by line.

On Monday the team lead sat with him for ten minutes:

```term
$ git log --oneline -3
9fba052 Change checkout button handler
98969a4 Add discount code field
085ad89 Fix typo on product page
$ git revert 9fba052
[main 6546696] Revert "Change checkout button handler"
```

Two commands. The history showed exactly which change happened when, and the broken change was undone without touching the good ones. That is what version control gives you: **a precise, trustworthy memory of every change**, and the power to move through it.

> [!NOTE]
> You will learn every command above in this path. For now, notice the shape of the fix: find the change, undo only that change.

## analogy | Save points, but smarter

Think of a long video game. Before the boss fight you **save**. If the fight goes badly, you **load** that save and try again. Without save points, one mistake costs you hours.

Version control is a save system for your project, with a few superpowers no game has:

- **Every save has a note.** "Add discount code field" tells you *why* this save exists.
- **You can see the difference between any two saves**, line by line.
- **You can undo one old change** while keeping everything after it, like removing one bad move from the middle of a game.
- **Several people can play at once** on their own copies and later combine their progress.
- **Nothing is overwritten.** Saving again never destroys an earlier save.

A second picture: a scientist's lab notebook. Every experiment gets a dated entry: what was done, by whom, and why. Nobody tears pages out. When something surprising happens months later, the notebook explains it. Git is that notebook for files, and it fills itself in with exact detail.

## model | What a version control system records

Without version control, people invent their own system, and it always decays into this:

```diagram
vcs-chaos
```

A version control system (VCS) replaces the copies with **one folder and a history**. Each entry in the history (git calls it a **commit**) records:

| Question | What git stores |
|---|---|
| What changed? | A full snapshot of every tracked file at that moment |
| Who changed it? | The author's name and email |
| When? | A timestamp |
| Why? | A message written by the author |
| What came before? | A link to the previous commit |

That last row matters most. Because each commit points at the one before it, the commits form a **chain**: the history of the project. Everything else you will learn (branches, merges, GitHub, pull requests) is a way of creating, moving along or combining these chains.

Git is a **distributed** VCS: every person's copy of a project holds the *complete* history, not just the latest files. You can browse history and commit on a plane with no internet. Servers like GitHub are just one more copy that everyone agrees to share.

## team | How real teams depend on it

Version control is not optional in professional software. Nearly every company, from a two-person agency to Google, keeps its code in a VCS, and most use git. Here is what that looks like day to day:

- **Parallel work.** Five developers change the same app at once, each on their own branch, and git combines their work.
- **Code review.** Before a change goes live, a teammate reads exactly what changed (a "diff") and approves it. On GitHub this is a pull request.
- **Deployments.** The live website is built from a specific commit. If a release breaks, the team redeploys the previous commit in minutes.
- **Archaeology.** Six months later someone asks "why does the timeout say 47 seconds?" `git blame` shows the commit, the author and the message that explains it.
- **Accountability without blame.** Every change has a name on it, which makes it easy to ask the right person a question.

It is not only for code. Writers keep books in git, scientists track analysis scripts and data notebooks, designers version design tokens, governments publish laws on GitHub, and system administrators version their server configuration.

## traps | Myths that trip up beginners

**"Git is a backup."** Not by itself. A repository on your laptop dies with your laptop. Git becomes a backup when you **push** to another machine, such as GitHub.

**"Git and GitHub are the same thing."** Git is a program on your computer. GitHub is a website that hosts git repositories and adds collaboration features. You will untangle these properly two lessons from now.

**"Version control is for big teams."** A solo developer benefits just as much: undo, history and safe experiments are useful even if nobody else ever sees the project.

**"I'll commit when it's finished."** The value comes from *small, frequent* commits. A history with one giant commit called "stuff" is almost as useless as no history.

**"Git stores only the differences."** Conceptually git stores full **snapshots**; it is just very clever about not storing the same content twice. Thinking in snapshots will make later topics much easier.

> [!TIP]
> Version control will feel like extra steps for about a week. After that, working without it feels like writing without an undo key.

## lab | Tour a project's memory

You have just joined a small bakery's website team. The project in `~/bakery` already uses git. Before learning any mechanics, see what a history can tell you.

You will use three commands: `git log` (list the history), `git show <id>` (look at one commit in detail) and `cat` (print a file). Every commit has an id like `a1b2c3d`; you only need the first 7 characters.

The panel on the right shows the same history as a graph. Watch it as you go.
