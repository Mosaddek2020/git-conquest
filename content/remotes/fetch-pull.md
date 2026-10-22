## story | "Pull broke my branch"

Every morning Dev typed `git pull` without thinking. One day it produced a merge commit he did not expect, on a branch where he had local commits, and his history became tangled.

His lead suggested a habit: **look before you leap**.

```term
$ git fetch
From https://github.com/acme/storefront
   3c1d0a2..9e8f7b6  main       -> origin/main
$ git log --oneline main..origin/main
9e8f7b6 Add gift cards
4a2b1c0 Fix currency rounding
$ git merge origin/main
```

`git fetch` downloaded the new commits and moved `origin/main`, but did not touch his work. He could inspect exactly what had arrived, then integrate it on his terms.

## model | Fetch updates bookmarks; pull also integrates

```replay
title: fetch, then merge (what pull does)
show: graph
setup: github acme/storefront; git clone -q https://github.com/acme/storefront.git; cd storefront; teammate acme/storefront "Add gift cards"
step: git status | Your clone has no idea anything changed. origin/main is still where it was at clone time.
step: git fetch | fetch downloads new commits and moves origin/main. Your main has not moved.
step: git merge origin/main | Integrate: main fast-forwards to origin/main. fetch + merge is exactly what git pull does.
```

| Command | Downloads | Moves `origin/*` | Changes your branch & files |
|---|---|---|---|
| `git fetch` | yes | yes | **no** |
| `git pull` | yes | yes | yes: merges (or rebases) the upstream into the current branch |

`git pull` = `git fetch` + `git merge @{upstream}` (or `git rebase` with `--rebase` / `pull.rebase=true`).

## commands | Fetch and pull

```term
$ git fetch                     # fetch from the current branch's remote (usually origin)
$ git fetch --all               # from every remote
$ git fetch --prune             # also forget branches deleted on the remote
$ git log --oneline main..origin/main   # what arrived that I don't have
$ git diff main origin/main     # how the files differ
$ git pull                      # fetch + merge into the current branch
$ git pull --rebase             # fetch + rebase your local commits on top
$ git pull --ff-only            # only if it's a fast-forward; otherwise refuse
```

## analogy | Checking the mailbox vs opening every letter

`git fetch` is collecting the mail from the mailbox and putting it on the hall table. You can read the envelopes, decide what to open, and nothing in your house changes yet.

`git pull` is collecting the mail and immediately opening every letter and filing its contents into your folders. Convenient, but you did not get to look first.

## team | Pulling well

- **Pull before you start work** each day, and before you push.
- **`git fetch` + look** when you are unsure what will happen.
- Teams often set `git config --global pull.rebase true` or `pull.ff only` so pulls never create surprise merge commits on local branches.
- If a pull conflicts, it is just a merge (or rebase) conflict: resolve it the usual way.

## traps | Fetch/pull traps

**Pulling with uncommitted changes.** If incoming changes touch the same files, git refuses. Commit or stash, or use `git pull --rebase --autostash`.

**Expecting `fetch` to change your files.** It never does.

**Pulling on the wrong branch.** `git pull` integrates into the **current** branch. Check `git branch` first.

## lab | Look before you leap

Teammates have pushed while you were away. Fetch, inspect exactly what arrived, then integrate.
