## story | The repository that got slow

The monolith was eight years old. `git status` took three seconds, `git log --graph` was sluggish, and a laptop's disk showed 4 GB under `.git`. Someone had also committed a database dump with real customer emails, then "removed" it with `git reset --hard`.

Two lessons came out of that week. First: git has **housekeeping** built in (packing, commit-graphs, scheduled maintenance) and it is worth turning on. Second: **"removed" is not deleted**. The reflog kept the dump reachable until someone expired it and pruned.

## model | Loose objects, packs and what keeps them alive

```diagram
loose-packed
```

- Every new blob, tree and commit starts as a **loose object**: one compressed file per object.
- **`git gc`** packs them into a **pack file** (with delta compression), writes a commit-graph to speed up history walks, and packs refs. Git runs `gc --auto` itself now and then.
- **`git maintenance start`** schedules lighter tasks in the background: hourly *prefetch* and *commit-graph*, daily *loose-objects* and *incremental-repack*, weekly *pack-refs*.
- An object stays as long as something **reaches** it: a branch, a tag, the stash, the index, or a **reflog** entry. Reflogs keep about 90 days of history, and unreachable objects get a further two-week grace period before gc prunes them.
- To really remove something now: drop what references it, `git reflog expire --expire=now --all`, then `git gc --prune=now`. **If it was ever pushed, rotate the secret**: other clones still have it.

```replay
title: gc packs loose objects
show: graph
setup: init; commit "Create app" app.js; commit "Add search" search.js; commit "Add filters" filters.js
step: git count-objects -v | Every new object starts loose: count is the number of loose objects.
step: git gc -q && git count-objects -v | After gc: count 0, everything in one compressed pack.
```

## commands | The housekeeping kit

```term
$ git count-objects -vH                       # loose count, pack count and sizes
$ git gc                                      # pack, prune old garbage, write commit-graph
$ git maintenance start                       # background maintenance for this repo
$ git maintenance run --task=commit-graph     # one task, now
$ git fsck                                    # integrity check; lists dangling commits
$ git fsck --lost-found                       # writes dangling commits to .git/lost-found

$ git reset --hard HEAD~1                     # the bad commit leaves the branch…
$ git reflog expire --expire=now --all        # …and every reflog
$ git gc --prune=now                          # unreachable objects are gone
```

Before deleting anything, `git fsck` is also a rescue tool: a **dangling commit** is often exactly the lost work you are looking for (`git branch rescue <id>`).

## analogy | A warehouse and its inventory

Loose objects are parcels left in the corridor; a pack is the same goods shelved and shrink-wrapped. gc is the night shift that shelves them. The reflog is the "returns" cage: things you threw out stay there for a while in case you change your mind, and only an explicit order to empty the cage (expire, then prune) sends them to the shredder.

## team | Keeping shared repositories healthy

- Run `git maintenance start` on big repositories you work in every day; it costs nothing noticeable and keeps commands fast.
- Large binary files are a different problem: use Git LFS (see Scale & Trust), not gc.
- On servers, the hosting platform runs gc. You still need to ask them to purge cached views after a history rewrite for leaked data.
- Treat "expire and prune" as **a last step of incident response**, after rotating credentials and rewriting any pushed history.

## traps | Housekeeping traps

**Pruning while you might still need the reflog.** `--expire=now` throws away your undo history. Only do it when you mean to destroy something.

**Believing reset deleted the data.** It only moved a branch. The commit sits in the reflog (and on any remote you pushed it to).

**Running `gc --aggressive` routinely.** It is slow and rarely helps; plain gc and maintenance are enough.

**Deleting `.git/objects` files by hand.** That corrupts the repository. Let gc decide what is unreachable.

## lab | Spring cleaning

`~/monolith` has a long history of loose objects and, on top, a commit with real customer data. Check how much is loose, pack it, turn on background maintenance, then remove the bad commit for real: off the branch, out of the reflog, and out of the object store.
