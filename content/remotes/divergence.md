## story | The pull that asked a question

After a git upgrade, Malik's usual `git pull` stopped and printed a wall of hints ending in:

```term
fatal: Need to specify how to reconcile divergent branches.
```

His local `main` had two commits that GitHub did not have, and GitHub had three that he did not have. The branches had **diverged**. Older git versions silently created a merge commit in this situation; newer versions ask you to choose a policy once, so pulls stop surprising you.

## model | Divergence and the three choices

```replay
title: Divergent branches: rebase vs merge
show: graph
setup: github acme/app; git clone -q https://github.com/acme/app.git; cd app; commit "My change A"; commit "My change B"; teammate acme/app "Their change X"; teammate acme/app "Their change Y"; git fetch -q
step: git status | Ahead by 2, behind by 2: the branches have diverged. A fast-forward is impossible in either direction.
step: git pull --rebase | Rebase policy: your two commits are replayed on top of theirs. Straight line, your commits get new ids.
step: git push | Now a normal push works.
```

When local and remote have both moved, a pull must combine them, and there are three policies:

| Setting | Behaviour on divergence | History |
|---|---|---|
| `pull.rebase false` | merge (creates a merge commit) | true record, with "Merge branch 'main' of …" commits |
| `pull.rebase true` | rebase your local commits on top | linear |
| `pull.ff only` | refuse; you decide manually | never surprising |

```term
$ git config --global pull.rebase true    # a popular choice for everyday work
$ git pull --rebase                       # or choose per pull
$ git pull --no-rebase                    # merge this time
```

## commands | Seeing and fixing divergence

```term
$ git fetch
$ git status                          # "have diverged, and have 2 and 3 different commits each"
$ git log --oneline --graph --all     # see both lines
$ git log --oneline origin/main..main # mine, not on the server
$ git log --oneline main..origin/main # theirs, not on my machine
$ git pull --rebase                   # replay mine on top of theirs
$ git rebase --continue               # if a conflict stopped it
$ git push
```

## analogy | Two hikers on a forked trail

You and a friend walked from the same signpost but took different paths for a while. To continue together you either **walk back and follow their path, then repeat your detour on top** (rebase), or **meet at a new junction that joins both paths** (merge). Either way, you cannot pretend the other person's path does not exist.

## team | What teams choose

- Many teams set `pull.rebase true` for local branches to avoid noisy "Merge branch 'main' of github.com/…" commits.
- Whatever you choose, **be consistent** across the team and document it.
- If a rebase-pull conflicts and you get lost, `git rebase --abort` and try `git pull --no-rebase` instead.

## traps | Divergence traps

**Answering the hint with `--force`.** Divergence is solved by integrating, not overwriting.

**Rebasing commits you already pushed elsewhere.** `pull --rebase` only replays commits that are not on the upstream, so it is safe for normal use.

**Ignoring "ahead/behind" in `git status`.** It tells you exactly what will happen on your next push or pull.

## lab | Reconcile divergent branches

While you worked offline, teammates pushed to main. Experience the divergence error, choose a policy, reconcile with a rebase, and push.
