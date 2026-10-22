## brief | Your first day, for real

This is the boss challenge for Base Camp. There is no new theory here: the challenge pulls together everything from this realm into one realistic scenario.

**The scenario.** You start as a junior developer at *Lumen Studio* on Monday. IT handed you a fresh laptop. Before your 10 am stand-up you need to:

1. Set up a tidy workspace folder.
2. Configure git with your identity and the team's defaults.
3. Take a look at the team's starter repository on GitHub and copy it to your machine.
4. Check its recent history so you can say something sensible about the project at stand-up.

Take a moment to recall the tools before you start:

| Need | Command |
|---|---|
| Where am I / what is here | `pwd`, `ls -a` |
| Make and enter folders | `mkdir -p`, `cd` |
| Configure git | `git config --global key "value"` |
| Read a GitHub repo | `gh repo view owner/name` |
| Copy a repo | `git clone <url>` |
| Read history | `git log --oneline` |

> [!TIP]
> Boss labs give fewer hints than normal labs. Try each task on your own before you open a hint: retrieving an answer from memory is exactly what makes it stick.

## recap | What Base Camp gave you

- **Version control** keeps a complete, trustworthy history: what changed, who, when and why. Teams depend on it to work in parallel, review changes, deploy and undo.
- **The terminal** is where git lives. Ten commands (`pwd`, `ls`, `cd`, `mkdir`, `touch`, `echo >`/`>>`, `cat`, `mv`, `cp`, `rm`) carry you a long way.
- **Git** is the program on your machine. **GitHub** is a service that hosts git repositories and adds collaboration.
- **Configure git** once per machine: `user.name`, `user.email`, `init.defaultBranch`, `core.editor`. Global settings live in `~/.gitconfig`; local ones in `.git/config` override them.

Next realm: you create your own repository and make your first commits.

## lab | Monday, 9:15 am

Complete the whole setup. The team's repository is `lumen-studio/starter-kit` on GitHub; you are a member of the organisation, so you can read it. Your workspace should be `~/code`.
