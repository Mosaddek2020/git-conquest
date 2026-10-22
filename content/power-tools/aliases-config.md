## story | Fifty keystrokes a minute

Watching a senior engineer pair-program, Theo noticed she never typed `git status`. She typed `git st`. Instead of `git log --oneline --graph --decorate --all` she typed `git lg`. Undoing the last commit was `git undo`. Over a day those shortcuts saved hundreds of keystrokes, and more importantly, she never had to remember long option lists.

## commands | Aliases

```term
$ git config --global alias.st status
$ git config --global alias.co checkout
$ git config --global alias.sw switch
$ git config --global alias.br "branch -vv"
$ git config --global alias.lg "log --oneline --graph --decorate --all"
$ git config --global alias.last "log -1 HEAD --stat"
$ git config --global alias.undo "reset --soft HEAD~1"
$ git config --global alias.unstage "restore --staged"
$ git config --global alias.amend "commit --amend --no-edit"
$ git lg                          # use them like built-in commands
$ git config --global --list | grep alias     # see them all
```

Extra arguments are appended: `git unstage app.js` runs `git restore --staged app.js`.

Aliases starting with `!` run shell commands: `git config --global alias.cleanup "!git branch --merged | grep -v main | xargs git branch -d"`.

## model | Power-up settings worth knowing

| Setting | Effect |
|---|---|
| `pull.rebase true` | `git pull` rebases instead of merging |
| `push.autoSetupRemote true` | the first push of a branch sets its upstream |
| `fetch.prune true` | every fetch removes stale `origin/*` branches |
| `rebase.autoSquash true` | `git rebase -i` applies fixup!/squash! commits automatically |
| `rerere.enabled true` | git remembers how you resolved a conflict and reuses it |
| `init.defaultBranch main` | new repos start on main |
| `core.editor "code --wait"` | your editor for messages |
| `diff.colorMoved zebra` | moved lines are highlighted differently from changed ones |
| `merge.conflictStyle zdiff3` | conflict markers also show the common ancestor |

All of them live in `~/.gitconfig`, a plain text file you can back up and copy between machines.

## analogy | Speed-dial

Aliases are speed-dial for git. You still know the full number (the real command), but you do not have to dial it every time.

## team | Sharing and restraint

- Many teams share a recommended `.gitconfig` snippet in their onboarding docs.
- Keep aliases memorable and few. A teammate reading over your shoulder should still understand.
- Learn the full commands first: aliases are for speed, not for avoiding understanding. In interviews, docs and other people's machines, only the real commands exist.

## traps | Alias traps

**Shadowing real commands.** An alias with the name of a built-in command is ignored by git.

**Quoting.** Multi-word aliases need quotes: `alias.lg "log --oneline --graph"`.

**Dangerous shortcuts.** An alias for `reset --hard` makes destruction too easy to type.

## lab | Build your toolkit

Set up a handful of aliases and power-up settings, then use them in a small repository.
