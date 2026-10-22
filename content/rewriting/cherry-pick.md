## story | One fix, two releases

The mobile team at a ride-sharing startup supports two versions: the current `main` and a `release/2.4` branch still used by many customers. Kenji fixed a crash in fare calculation on `main`. Customers on 2.4 needed the same fix, but nothing else from `main`, which contained half-finished features.

```term
$ git switch release/2.4
$ git cherry-pick 7c3e9a1
[release/2.4 b42f0d8] Fix crash when the fare is zero
 1 file changed, 2 insertions(+), 1 deletion(-)
```

`git cherry-pick` copied exactly that one commit's change onto the release branch.

## model | Copying one commit's change

```diagram
cherry-pick
```

Cherry-pick takes the **change** a commit introduced (its diff against its parent) and applies it on top of the current branch as a **new commit**: same message and author, new id, new parent.

```replay
title: Cherry-picking a hotfix onto a release branch
show: graph
setup: init; commit "Release 2.4"; git branch release-2.4; commit "Start new booking flow"; commit "Fix crash when fare is zero"; commit "Redesign the map"; git switch release-2.4
step: git cherry-pick main~1 | Only the fix is copied to release-2.4, as a brand-new commit. The new booking flow and map redesign stay on main.
```

## commands | Cherry-pick recipes

```term
$ git cherry-pick <commit>          # copy one commit here
$ git cherry-pick A B C             # several commits, in that order
$ git cherry-pick A..B              # a range (commits after A up to B)
$ git cherry-pick -x <commit>       # add "(cherry picked from commit …)" to the message
$ git cherry-pick --no-commit <c>   # apply the change but let me commit it
$ git cherry-pick --continue | --abort | --skip   # after a conflict
```

`-x` is good practice on release branches: the note records where the fix came from.

## analogy | Photocopying one recipe

You have a big family cookbook (main) and a small pocket book (the release branch). You do not copy the whole cookbook into the pocket book; you photocopy the one recipe you need and paste it in. It is a copy, not the original page: if someone later edits the original, the copy does not change.

## team | When to cherry-pick, and when not to

Good uses:

- **Backporting** a fix to a maintained release branch.
- **Rescuing** a commit made on the wrong branch (cherry-pick it to the right one, then remove it from the wrong one).
- Pulling **one useful commit** out of an abandoned branch.

Overuse is a smell: if you constantly cherry-pick between two long-lived branches, the same change exists twice under different ids, which makes later merges noisy. Usually a merge, or branching from the right place in the first place, is better.

## traps | Cherry-pick traps

**Picking a commit that depends on earlier ones.** The change may not apply cleanly (conflict) or may break the build. Pick the dependencies too, in order.

**Picking a merge commit** needs `-m 1`, and is rarely what you want.

**Duplicated commits.** The same change under two ids can confuse readers. `-x` helps.

## lab | Backport and rescue

A fix landed on main that a release branch also needs, and a commit was made on the wrong branch. Use cherry-pick for both jobs.
