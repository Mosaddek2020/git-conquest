## story | The rebase that confused everyone

Tariq rebased the shared `develop` branch to "clean it up" and force-pushed. The next morning, five teammates pulled and got strange results: duplicated commits, conflicts in code they had never touched, and one colleague's work that seemed to vanish. It took the team half a day to untangle.

Nothing in git broke. Tariq had rewritten commits that other people had already built on. Their repositories still referenced the old commits; his now referenced new copies with different ids. Git saw two different histories and did its best to combine them.

## model | Private vs shared history

```diagram
rebase-vs-merge
```

**The golden rule of rebasing: never rewrite commits that exist outside your own repository and that other people may have built on.**

| History is… | Safe tools | Avoid |
|---|---|---|
| **Private** (only on your machine, or on your own branch nobody else uses) | amend, reset, rebase, interactive rebase, squash | nothing: polish freely |
| **Shared** (on main, develop, or any branch teammates pull) | merge, revert, new commits | amend, reset, rebase, force push |

"Pushed" is a decent proxy for "shared", but the real question is: *could someone else have these commits and build on them?* Your personal feature branch on GitHub that nobody else touches can still be rebased (followed by `git push --force-with-lease`, covered in the Remotes realm).

## analogy | Editing a document after it is shared

Editing your own draft before sending it is normal. But once you have emailed the document to ten people and they have started adding comments to page 4, you do not silently renumber the pages and send a "new" document with the same name. You send an addendum (a new commit) instead.

## team | Merge or rebase? A practical policy

Teams argue about this endlessly. A sensible default that most teams converge on:

1. **Rebase your own feature branch** onto main to stay current (`git pull --rebase`, `git rebase main`). Clean, linear, no noise.
2. **Merge (or squash-merge) the feature into main** through a pull request. Shared history only ever moves forward.
3. **Never rebase main** or any branch others commit to.

| | Merge | Rebase |
|---|---|---|
| History | True record, with merge commits | Linear, tidy |
| Commit ids | Unchanged | Rewritten |
| Conflicts | Resolved once | Possibly once per replayed commit |
| Safe on shared branches | Yes | No |
| Best for | Integrating finished work into shared branches | Updating and polishing private work |

## commands | Recovering from a rewrite

If you rebased or reset something you should not have, and **nobody has pulled yet**:

```term
$ git reflog                      # find the pre-rebase position
$ git reset --hard ORIG_HEAD      # ORIG_HEAD: where the branch was before the last rebase/reset
```

If teammates **already have** the rewritten history, talk to them before doing anything else. Each person may need to rebase their own work onto the new history (`git rebase --onto`), which is advanced territory: prevention is far cheaper.

## traps | Golden-rule traps

**"I'll just force-push, it's fine."** It may be fine on your own branch. It is never fine on main.

**Rebasing a branch you shared for review** while a reviewer has checked it out. Tell them, or prefer adding commits until the review ends.

**Thinking merge commits are "bad".** They are an honest record. Linear history is a preference, not a rule.

## lab | Choose the right tool

Two branches, two situations. One branch is private and messy; the other is shared. Tidy the private one with rebase, and integrate into the shared one with merge, leaving the shared history untouched.
