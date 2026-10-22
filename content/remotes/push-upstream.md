## story | "Rejected?!"

Priya finished a fix and pushed:

```term
$ git push
To https://github.com/acme/storefront.git
 ! [rejected]        main -> main (fetch first)
error: failed to push some refs to 'https://github.com/acme/storefront.git'
hint: Updates were rejected because the remote contains work that you do not
hint: have locally. ...
```

Her first instinct was to search "how to force push". Her lead stopped her. The message meant exactly what it said: **someone else had pushed first**. Git was protecting their work. Pushing would only be allowed once her branch *contained* theirs.

```term
$ git pull --rebase
$ git push
   9e8f7b6..a1c2d3e  main -> main
```

## model | Push only moves forward

`git push` asks the remote to move its branch to your commit. The remote agrees only if that is a **fast-forward**: the remote's current commit must already be in your history. Otherwise your push would throw away commits that exist only on the server.

```replay
title: A rejected push, and the fix
show: graph
setup: github acme/storefront; git clone -q https://github.com/acme/storefront.git; cd storefront; commit "Fix price rounding"; teammate acme/storefront "Add gift cards"
step: git push | Rejected: GitHub has a commit you do not have. Pushing would erase it.
step: git pull --rebase | Fetch the teammate's commit and replay yours on top.
step: git push | Now GitHub's main is in your history, so the push is a fast-forward.
```

## commands | Pushing and upstreams

```term
$ git push                          # push the current branch to its upstream
$ git push origin main              # push main to origin explicitly
$ git push -u origin feature/x      # first push of a new branch: create it on origin and set upstream
$ git push origin feature/x:review  # push local feature/x to a remote branch called review
$ git push --tags                   # push tags
$ git branch -vv                    # see each branch's upstream and ahead/behind
$ git branch -u origin/feature/x    # set the upstream of the current branch afterwards
```

A brand-new branch has no upstream, so a plain `git push` explains what to do:

```term
fatal: The current branch feature/gift-cards has no upstream branch.
To push the current branch and set the remote as upstream, use

    git push --set-upstream origin feature/gift-cards
```

`-u` is short for `--set-upstream`. After that one push, plain `git push` and `git pull` work on that branch. Setting `git config --global push.autoSetupRemote true` makes git do this automatically.

`git status` uses the upstream to tell you where you stand:

```term
Your branch is ahead of 'origin/main' by 2 commits.
  (use "git push" to publish your local commits)
```

## analogy | A shared logbook

The remote branch is a shared logbook. You may only **append** pages after the last page in it. If someone appended pages since you last looked, you must first copy their pages into your own copy (pull), add yours after them, and then append to the shared logbook. Tearing out their pages so yours fit (force push) is not allowed without a very good reason.

## team | Push habits

- **Pull (rebase) before you push**, especially on shared branches.
- **Push feature branches early** with `-u`. It backs up your work and lets others see it.
- On GitHub, pushing a new branch prints a link to open a pull request for it.
- Many teams block direct pushes to `main` entirely (protected branches): all changes go through pull requests.

## traps | Push traps

**Reaching for `--force` on a rejection.** A rejection on a shared branch means "integrate first", not "overwrite".

**Pushing the wrong branch.** `git push origin main` while on a feature branch pushes your local *main*, not the feature.

**Expecting `git push` to push all branches.** By default it pushes only the current branch.

## lab | Your first pushes

You cloned the team repository. Push a fix to main (a teammate will beat you to it), then publish a new feature branch with an upstream.
