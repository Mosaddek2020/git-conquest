## story | The force push that erased a day

Late one evening Sven rebased his branch, pushed with `--force`, and logged off. He had forgotten that Nora had pushed two commits to the same branch an hour earlier. His force push replaced the remote branch with his version; her commits were simply gone from GitHub.

They recovered them from Nora's laptop the next morning, but the team adopted a rule that day: **never `--force`; use `--force-with-lease`**.

```term
$ git push --force-with-lease
 ! [rejected]        feature/search -> feature/search (stale info)
```

`--force-with-lease` would have refused, because the remote branch was no longer where Sven's `origin/feature/search` said it was. Someone had pushed since his last fetch.

## model | Force with a safety check

| Command | Overwrites remote branch… |
|---|---|
| `git push` | never (fast-forwards only) |
| `git push --force` | always, even if others pushed since you last fetched |
| `git push --force-with-lease` | only if the remote is still exactly where your `origin/<branch>` bookmark says it is |

You need a force push after **rewriting** a branch you had already pushed (rebase, amend, interactive rebase), typically your own feature branch during review. Never on shared branches like `main`.

## commands | Force, delete, prune

```term
$ git push --force-with-lease               # safe overwrite of your own rewritten branch
$ git push origin --delete feature/old      # delete a branch on the remote
$ git push origin :feature/old              # older syntax for the same thing
$ git fetch --prune                         # remove origin/* bookmarks for branches deleted on the remote
$ git config --global fetch.prune true      # prune automatically on every fetch
$ git branch -vv                            # ": gone]" marks local branches whose upstream was deleted
$ git remote prune origin                   # prune without fetching
```

## analogy | Replacing a page, politely

`--force` is ripping out the last pages of the shared logbook and gluing in your own, without looking. `--force-with-lease` is first checking that the last page is still the one you remember. If someone has added a page since, you stop and talk to them.

## team | Cleaning up after merges

After a pull request merges, its branch is usually deleted on GitHub (automatically or with a button). Your machine still has:

1. the local branch `feature/x`, and
2. the bookmark `origin/feature/x`.

`git fetch --prune` removes the bookmark; `git branch -d feature/x` removes the local branch. `git branch -vv` shows which local branches have lost their upstream (`[origin/feature/x: gone]`).

## traps | Force and prune traps

**`--force` on main.** Rewrites history for the whole team. Protected branches on GitHub usually forbid it.

**Fetching right before `--force-with-lease`.** A fresh fetch updates your bookmark to the remote's current state, so the lease check passes even if you have not looked at the new commits. Look at what you fetched before forcing.

**Deleting the remote branch someone still uses.** Check open pull requests first.

## lab | Rewrite safely and clean up

Your feature branch on GitHub needs a rebase-and-force-push, a teammate interferes, and afterwards you clean up merged branches locally and remotely.
