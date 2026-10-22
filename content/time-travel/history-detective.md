## story | Who changed the shipping fee?

On Monday the support inbox of an online bookshop filled with complaints: shipping to Canada had jumped from $8 to $80. Somebody had added a zero. Nobody admitted it, nobody remembered it, and the change could have been made any time in the last two weeks among 140 commits.

Mei, the newest developer, found it in under two minutes:

```term
$ git log -S "80" --oneline -- shipping/rates.json
4c1d0a7 Update rates for 2026
$ git show 4c1d0a7 --stat
 shipping/rates.json | 2 +-
$ git log -1 --format="%an, %ar" 4c1d0a7
Joel Kim, 6 days ago
```

`git log -S` finds commits that **added or removed** a piece of text. Combined with a path filter and `git show`, it pointed straight at the commit, its author and its date. Joel fixed the typo in a new commit five minutes later, and Mei earned a reputation as the person who can find anything.

History is only valuable if you can search it. This lesson turns `git log` from a wall of text into a search engine.

## model | Naming commits

Before you can travel through history you need ways to **name** points in it:

| Name | Means |
|---|---|
| `a1b2c3d` | A commit by (short) id. 7 characters are usually unique. |
| `HEAD` | The commit you are on now |
| `main`, `feature/x` | The commit a branch points at |
| `HEAD~1`, `HEAD~3` | 1 or 3 generations back, following first parents |
| `HEAD^` | The first parent (same as `HEAD~1`) |
| `HEAD^2` | The **second** parent (only merge commits have one) |
| `v1.0` | A tag |
| `main..feature` | Commits on feature that are not on main |

```replay
title: HEAD~n walks back through parents
show: graph
setup: init; commit "One"; commit "Two"; commit "Three"; commit "Four"
step: git log --oneline -1 HEAD | HEAD is the newest commit, "Four".
step: git log --oneline -1 HEAD~1 | HEAD~1 is its parent, "Three".
step: git log --oneline -1 HEAD~3 | HEAD~3 goes three generations back, to "One".
```

## commands | Searching history

```term
$ git log --oneline -n 10                 # last ten commits
$ git log --since="2 weeks ago" --until="yesterday"
$ git log --author="Joel"                 # by author (a regex: partial names work)
$ git log --grep="shipping"               # by words in the message
$ git log -S "freeShipping"               # commits that added/removed this text ("pickaxe")
$ git log -- shipping/rates.json          # only commits touching this path
$ git log --stat                          # files changed per commit
$ git log -p -2                           # full diffs of the last two commits
$ git log main..feature                   # what feature has that main does not
$ git log --format="%h %an %ar %s"        # your own format
```

Format placeholders worth knowing: `%h` short id, `%H` full id, `%an` author name, `%ar` relative date, `%ad` date, `%s` subject (first line).

Filters combine. `git log --author=Joel --since="1 month ago" -- shipping/` reads like a sentence.

## analogy | A detective's toolkit

A detective rarely reads every file in the archive. They filter: *who* was there, *when*, *what* was touched, *which words* appear in the statement. `git log` filters work the same way:

- `--author` is "who was there"
- `--since` / `--until` is "when"
- `-- path` is "what was touched"
- `--grep` searches the statements (messages)
- `-S` searches the evidence itself (the code)

## team | History on a real team

- **Incident reviews** start with "what changed recently?": `git log --since="2 days ago" --oneline`.
- **Onboarding**: reading `git log --oneline -- src/payments` shows how a module evolved and who knows it best.
- **Release notes**: `git log v1.3.0..v1.4.0 --oneline` lists everything shipped between two releases.
- **Code review**: `git log main..my-branch` shows exactly what your pull request contains.

> [!TIP]
> Create an alias for the view you use most: `git config --global alias.lg "log --oneline --graph --all"`.

## traps | Log pitfalls

**Forgetting `--` before a path that looks like a branch name.** `git log -- main.py` is unambiguous; use `--` when in doubt.

**`--grep` searches messages, not code.** To search code changes, use `-S`.

**`--author` matches name or email**, partial and case-sensitive by default. `--author=joel` might not match "Joel".

**`HEAD~2` vs `HEAD^2`.** The first means "grandparent"; the second means "second parent of a merge". Mixing them up gives confusing results on merge commits.

## lab | Find the shipping-fee culprit

The bookshop repository has a few weeks of history from several people. Use log filters to answer the questions. The **Commit graph** panel helps you check your answers.
