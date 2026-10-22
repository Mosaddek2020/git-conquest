## story | "Just put it on Git"

On her first day at a fintech startup, Ama was told: "Clone the repo from GitHub, make a branch, and open a PR when you're done." She nodded and then searched for "how to download Git from GitHub."

That search reveals a very common confusion. Git and GitHub are two different things that work together, like **email** and **Gmail**:

- **Email** is a protocol: a way of sending messages that many programs understand.
- **Gmail** is one company's service built around email, with a website, search, spam filters and more.

Likewise:

- **Git** is a program that runs on *your* computer and tracks the history of a project folder. It is free, open source and works completely offline.
- **GitHub** is a website (owned by Microsoft) that stores git repositories online and adds collaboration features: pull requests, code review, issues, automation (Actions), and a social network for code.

Ama's instructions really meant: *use git on your laptop to copy the project from GitHub, make your changes with git, then use GitHub's website to propose them.*

## model | Who does what

```diagram
git-vs-github
```

| | Git | GitHub |
|---|---|---|
| What is it? | A command-line program | A website and cloud service |
| Where does it run? | Your computer | Microsoft's servers |
| Needs internet? | No | Yes |
| Made by | Linus Torvalds (2005) and open-source contributors | GitHub Inc., founded 2008, Microsoft since 2018 |
| Main jobs | Commits, branches, merges, history | Hosting repos, pull requests, reviews, issues, Actions, Pages |
| Alternatives | Mercurial, SVN (older) | GitLab, Bitbucket, Azure Repos, Gitea |

Git came first. Linus Torvalds wrote it in 2005 to manage the Linux kernel, a project with thousands of contributors. Its design goals were speed, integrity (no silent corruption), and letting everyone work independently with a full copy of the history.

## analogy | Notebook and library

Git is your **notebook**. You write in it at home, you can flip back through every page, and nobody else needs to be involved.

GitHub is the **library** where you place a copy of your notebook so others can read it, make their own copies, suggest changes on sticky notes, and discuss them. The library also has noticeboards (issues), a review desk (pull requests) and a robot that checks every suggestion (Actions).

You can keep a notebook without ever going to a library. But to work with a team, you need a shared place, and GitHub is the most popular one.

## commands | Talking to each

You will use two command-line tools:

```term
$ git --version
git version 2.47.0
$ gh --version
gh version 2.63.0
```

- `git` does everything local: history, commits, branches, merges. It also moves commits to and from servers (`git clone`, `git push`, `git pull`).
- `gh` is GitHub's official command-line tool. It does GitHub things without opening the browser: create repositories, open pull requests, view issues.

```term
$ gh auth status                 # am I logged in to GitHub?
$ gh repo view octo-org/handbook # read a repository's description and README
$ git clone https://github.com/octo-org/handbook.git   # copy it to my machine
```

Notice that the URL in `git clone` is just an address. Git does not care that it is GitHub; the same command works with GitLab or your company's own server.

## team | Where the line falls at work

On a typical team day:

| Task | Tool |
|---|---|
| Write code, commit, switch branches | git, on your laptop |
| Get teammates' latest work | `git pull`, from GitHub |
| Share your branch | `git push`, to GitHub |
| Propose merging your branch | GitHub pull request (website or `gh pr create`) |
| Review a colleague's change | GitHub's review screen |
| Run tests on every change | GitHub Actions |
| Track bugs and tasks | GitHub Issues (or Jira, Linear…) |

Some companies use GitLab or Bitbucket instead. Everything you learn about git transfers 100%. The GitHub-specific parts (PRs, Actions) have close equivalents everywhere: GitLab calls a pull request a "merge request."

## traps | Mix-ups to avoid

**"I'll download git from GitHub."** Install git from git-scm.com (or your OS package manager). GitHub is not required to use git.

**"My code is on Git."** People say this, but strictly your code is in a git *repository*, which may *also* be on GitHub.

**"If GitHub is down, I can't work."** You can keep committing locally. You only need GitHub to share.

**"GitHub Desktop is git."** It is a graphical app that runs git commands for you. Helpful, but learn the commands first: every tool, tutorial and error message speaks git.

## lab | Meet both tools

Your laptop has git installed and you are logged in to a (simulated) GitHub account named `you`. An organisation called `octo-org` has published its team handbook as a public repository.

Use both tools: ask git and gh who they are, read the repository on GitHub, then make your own local copy with git. Open the **GitHub** panel to see the website side.
