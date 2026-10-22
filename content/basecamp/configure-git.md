## story | The commits signed by "root"

Kofi's team noticed something odd in their history: dozens of commits by an author called `root <root@ubuntu-s-1vcpu>`. Nobody knew who that was. It turned out to be Kofi himself: he had been committing from a server where git had never been told his name, so it guessed from the machine.

On GitHub those commits were not linked to his profile, did not count towards his contribution graph, and when a bug turned up the team had to ask around to find out who wrote the code.

The fix took fifteen seconds:

```term
$ git config --global user.name "Kofi Mensah"
$ git config --global user.email "kofi@example.com"
```

Every commit you make carries a name and an email. Setting them is the very first thing to do on any machine where you use git.

## commands | Install, then configure

**Install git**

- **Windows**: download *Git for Windows* from git-scm.com. Accept the defaults, and use *Git Bash* as your terminal.
- **macOS**: run `git --version` in Terminal; macOS offers to install the developer tools. Or `brew install git`.
- **Linux**: `sudo apt install git` (Debian/Ubuntu) or `sudo dnf install git` (Fedora).

Check it worked:

```term
$ git --version
git version 2.47.0
```

**Configure it once per machine**

```term
$ git config --global user.name "Your Name"
$ git config --global user.email "you@example.com"
$ git config --global init.defaultBranch main
$ git config --global core.editor "code --wait"
```

| Setting | Why |
|---|---|
| `user.name` | Shown as the author of every commit |
| `user.email` | Links commits to your GitHub account. Use an email that is on your GitHub profile (or GitHub's private `…@users.noreply.github.com` address). |
| `init.defaultBranch` | New repositories start on `main` instead of git's old default `master` |
| `core.editor` | The editor git opens when it needs you to write text, such as a commit message |

**Read your configuration**

```term
$ git config user.name          # one value
$ git config --list             # everything
$ git config --list --show-origin   # everything, plus which file it came from
```

## model | Three levels of settings

Git reads settings from three places, and the most specific one wins:

| Level | Flag | Stored in | Applies to |
|---|---|---|---|
| System | `--system` | `/etc/gitconfig` | every user on the machine |
| Global | `--global` | `~/.gitconfig` | every repository of *your* user |
| Local | (no flag) | `.git/config` inside a repository | only that repository |

So you can set your personal email globally, and override it inside your work repositories:

```term
$ cd ~/work/payroll
$ git config user.email "kofi@company.com"   # local: only this repo
```

The settings are plain text files. `~/.gitconfig` looks like this:

```text
[user]
	name = Kofi Mensah
	email = kofi@example.com
[init]
	defaultBranch = main
```

## analogy | Your name badge

Configuring git is like filling in the name badge you wear at a conference. You only do it once at the door, but it is on display in every conversation you have afterwards.

The global/local levels are like wearing your personal badge everywhere, but swapping to a company badge while you are at the company's stand.

## team | What teams usually standardise

Teams often add a few more global settings in their onboarding guide:

```term
$ git config --global pull.rebase true          # keep history linear when pulling
$ git config --global push.autoSetupRemote true # first push of a branch sets its upstream
$ git config --global fetch.prune true          # forget branches deleted on the server
$ git config --global alias.st status           # shortcuts
```

You will learn what each of these means later in the path. The point now: **git is configurable, and teams share good defaults.** When you join a team, ask for their recommended git settings.

## traps | Configuration gotchas

**Typos in the key.** `git config --global user.mail` (missing `e`) silently creates a useless setting. Check with `git config --list`.

**Forgetting `--global`.** Without it, the setting applies only to the repository you are standing in, and only if you are inside one.

**Using the wrong email.** If the email does not match one on your GitHub account, your commits show up as an unknown grey avatar.

**Quotes.** Names with spaces need quotes: `git config --global user.name "Ada Lovelace"`. Without them, git keeps only "Ada".

## lab | Introduce yourself to git

You are on a brand-new laptop. Git is installed but knows nothing about you: try `git config --list` and you will see it is almost empty.

Set your identity and sensible defaults, then confirm everything is in place. Use your own name or a made-up one, but make the email look like an email.
